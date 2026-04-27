import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import {
  getDosoSourceCategoryMapping,
  resolveOrCreateCategoryByDosoSource,
  resolveDirectoryFallbackCategory,
  resolveMappedCategoryBySourceCategoryId,
} from "@/lib/doso/sourceCategoryStore";
import { supabaseAdmin } from "@/lib/supabase";

const detectDosoDirectoryUrl = (originalUrl?: string | null) => {
  const value = String(originalUrl || "").trim();
  if (!value) return null;

  const knownPaths = [
    "/onlineMall/selfOperatedMall",
    "/onlineMall/PreSelfOperatedMall",
    "/onlineMall/etonet",
    "/onlineMall/etonetRanking",
    "/onlineMall/tanbaya",
    "/onlineMall/dabandaxi",
    "/onlineMall/dabansinei",
    "/onlineMall/shineiRanking",
    "/onlineMall/gomen",
  ];

  for (const path of knownPaths) {
    if (value.includes(path)) {
      return `https://www.doso.net${path}`;
    }
  }

  return null;
};

const isLikelyNumericCategoryName = (value?: string | null) => {
  const raw = String(value || "").trim();
  if (!raw) return false;
  const compact = raw.replace(/[\s\-_/().]/g, "");
  if (!compact) return false;
  if (/^\d+$/.test(compact)) return true;

  const digitCount = (compact.match(/\d/g) || []).length;
  return digitCount / compact.length >= 0.7;
};

const validateManualMergeCategoryIds = async (
  admin: ReturnType<typeof supabaseAdmin>,
  ids: number[],
  expectedL1Id?: number | null
) => {
  if (ids.length < 2) {
    return { ok: false as const, error: "invalid_manual_merge_category" };
  }

  const [l1Id, l2Id, l3IdRaw] = ids;
  const l3Id = l3IdRaw || null;
  if (expectedL1Id && l1Id !== expectedL1Id) {
    return { ok: false as const, error: "invalid_manual_merge_hierarchy" };
  }

  const categoryIds = [l1Id, l2Id, l3Id].filter(Boolean) as number[];
  const { data: categories, error: categoryError } = await admin
    .from("categories")
    .select("id, level, active")
    .in("id", categoryIds)
    .returns<Array<{ id: number; level: number; active: boolean }>>();

  if (categoryError) {
    return { ok: false as const, error: categoryError.message };
  }

  const map = new Map((categories || []).map((c) => [c.id, c]));
  const l1 = map.get(l1Id);
  const l2 = map.get(l2Id);
  const l3 = l3Id ? map.get(l3Id) : null;

  if (!l1 || !l2 || !l1.active || !l2.active || l1.level !== 1 || l2.level !== 2) {
    return { ok: false as const, error: "invalid_manual_merge_category" };
  }
  if (l3Id && (!l3 || !l3.active || l3.level !== 3)) {
    return { ok: false as const, error: "invalid_manual_merge_category" };
  }

  const relationPairs: Array<{ parent: number; child: number }> = [{ parent: l1Id, child: l2Id }];
  if (l3Id) relationPairs.push({ parent: l2Id, child: l3Id });

  for (const pair of relationPairs) {
    const { data: relation, error: relError } = await admin
      .from("category_relations")
      .select("parent_category_id")
      .eq("parent_category_id", pair.parent)
      .eq("child_category_id", pair.child)
      .limit(1)
      .maybeSingle();

    if (relError) {
      return { ok: false as const, error: relError.message };
    }
    if (!relation) {
      return { ok: false as const, error: "invalid_manual_merge_hierarchy" };
    }
  }

  return {
    ok: true as const,
    resolvedCategoryIds: [l1Id, l2Id, l3Id].filter(Boolean) as number[],
  };
};

const validateL1CategoryId = async (
  admin: ReturnType<typeof supabaseAdmin>,
  l1Id: number
) => {
  const { data, error } = await admin
    .from("categories")
    .select("id, level, active")
    .eq("id", l1Id)
    .limit(1)
    .maybeSingle<{ id: number; level: number; active: boolean }>();

  if (error) {
    return { ok: false as const, error: error.message };
  }
  if (!data || !data.active || data.level !== 1) {
    return { ok: false as const, error: "invalid_l1_override" };
  }
  return { ok: true as const };
};

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const admin = supabaseAdmin();
    const body = await request.json();
    const {
      sku,
      title,
      description,
      cost_twd,
      wholesale_price_twd,
      retail_price_twd,
      original_url, // string, optional
      source_category_id,
      source_directory_url,
      status = "published",
      category_ids = [], // number[]
      tag_ids = [], // number[]
      image_urls = [], // string[]
      specs = [], // {name: string, values: string[]}[]
      variants = [], // {name: string, options: any, price: number, stock: number, sku: string}[]
    } = body || {};
    const categoryReviewMode = body?.category_review_mode === "preview" ? "preview" : "confirm";
    const manualMergeCategoryIds = Array.isArray(body?.manual_merge_category_ids)
      ? body.manual_merge_category_ids
          .map((x: any) => Number(x))
          .filter((x: number) => Number.isInteger(x) && x > 0)
      : [];
    const categoryL1IdOverride = Number.isInteger(Number(body?.category_l1_id_override))
      && Number(body?.category_l1_id_override) > 0
      ? Number(body.category_l1_id_override)
      : null;

    if (!sku || !title) {
      return NextResponse.json({ error: "缺少必要欄位：sku, title" }, { status: 400 });
    }

    if (categoryL1IdOverride) {
      const l1Validation = await validateL1CategoryId(admin, categoryL1IdOverride);
      if (!l1Validation.ok) {
        return NextResponse.json({ error: l1Validation.error }, { status: 400 });
      }
    }

    // 保證 TWD 為整數
    const toInt = (v: any) => (v === null || v === undefined || v === "" ? null : Math.floor(Number(v)));
    const mappingConfig = await getDosoSourceCategoryMapping();

    let resolvedCategoryIds = (Array.isArray(category_ids) ? category_ids.filter((x: any) => !!x) : []) as number[];
    const directoryUrl =
      detectDosoDirectoryUrl(
        typeof source_directory_url === "string" ? source_directory_url : null
      ) ||
      (typeof source_directory_url === "string" && source_directory_url.trim()) ||
      detectDosoDirectoryUrl(original_url);

    const sourceCategoryId =
      source_category_id === null || source_category_id === undefined
        ? ""
        : String(source_category_id).trim();
    const sourceCategoryName =
      body?.source_category_name === null || body?.source_category_name === undefined
        ? body?.sourceCategoryName === null || body?.sourceCategoryName === undefined
          ? ""
          : String(body.sourceCategoryName).trim()
        : String(body.source_category_name).trim();

    let previewMapping: { l1_id: number | null; l2_id: number | null; l3_id: number | null } | null = null;
    let previewWouldAutoCreate = false;
    const riskFlags: string[] = [];

    if (isLikelyNumericCategoryName(sourceCategoryName)) {
      riskFlags.push("numeric_name");
    }

    if (directoryUrl) {
      const mapped = await resolveMappedCategoryBySourceCategoryId(sourceCategoryId, directoryUrl);
      const fallback = mapped ? null : await resolveDirectoryFallbackCategory(directoryUrl);
      previewMapping = {
        l1_id: (mapped?.l1_id || fallback?.l1_id || null) as number | null,
        l2_id: (mapped?.l2_id || fallback?.l2_id || null) as number | null,
        l3_id: (mapped?.l3_id || fallback?.l3_id || null) as number | null,
      };
      previewWouldAutoCreate = !mapped && !fallback && Boolean(sourceCategoryId || sourceCategoryName);
      if (previewWouldAutoCreate) {
        riskFlags.push("auto_create");
      }
      if (!mapped && !fallback && !previewWouldAutoCreate) {
        riskFlags.push("missing_mapping");
      }
    }

    const previewL1Id =
      categoryL1IdOverride ||
      Number(mappingConfig.l1_japan_id) ||
      previewMapping?.l1_id ||
      null;
    const previewL2Id = previewMapping?.l2_id || null;
    const previewL3Id = previewMapping?.l3_id || null;

    if (previewL1Id && previewL2Id) {
      const hierarchyValidation = await validateManualMergeCategoryIds(
        admin,
        [previewL1Id, previewL2Id, previewL3Id || null].filter(Boolean) as number[]
      );
      if (!hierarchyValidation.ok) {
        riskFlags.push("override_l1_hierarchy_mismatch");
      }
    }

    if (categoryReviewMode === "preview") {
      const needsReview = riskFlags.length > 0;
      return NextResponse.json({
        ok: true,
        category_review: {
          needs_review: needsReview,
          would_auto_create: previewWouldAutoCreate,
          risk_flags: riskFlags,
          proposed_category: {
            l1_id: previewL1Id,
            l2_id: previewL2Id,
            l3_id: previewL3Id,
            l2_name: previewWouldAutoCreate ? sourceCategoryName || sourceCategoryId || null : null,
            l3_name: null,
          },
          source: {
            source_category_id: sourceCategoryId || null,
            source_category_name: sourceCategoryName || null,
            directory_url: directoryUrl || null,
          },
        },
      });
    }

    if (manualMergeCategoryIds.length > 0) {
      const expectedL1Id = categoryL1IdOverride || Number(mappingConfig.l1_japan_id) || null;
      const mergeValidation = await validateManualMergeCategoryIds(
        admin,
        manualMergeCategoryIds,
        expectedL1Id
      );
      if (!mergeValidation.ok) {
        return NextResponse.json({ error: mergeValidation.error }, { status: 400 });
      }
      resolvedCategoryIds = mergeValidation.resolvedCategoryIds;
    } else if (directoryUrl) {
      const autoCreated = await resolveOrCreateCategoryByDosoSource(
        sourceCategoryId,
        sourceCategoryName,
        directoryUrl
      );

      const mapped = autoCreated
        ? null
        : await resolveMappedCategoryBySourceCategoryId(sourceCategoryId, directoryUrl);
      const fallback = autoCreated || mapped ? null : await resolveDirectoryFallbackCategory(directoryUrl);
      const finalMapping = autoCreated || mapped || fallback;

      if (!finalMapping?.l1_id || !finalMapping?.l2_id) {
        if (!resolvedCategoryIds.length) {
          return NextResponse.json({ error: "missing_category_mapping" }, { status: 400 });
        }
      } else {
        const resolvedL1Id = categoryL1IdOverride || finalMapping.l1_id;
        if (categoryL1IdOverride) {
          const hierarchyValidation = await validateManualMergeCategoryIds(
            admin,
            [resolvedL1Id, finalMapping.l2_id, finalMapping.l3_id || null].filter(Boolean) as number[]
          );
          if (!hierarchyValidation.ok) {
            return NextResponse.json({ error: "invalid_l1_override_hierarchy" }, { status: 400 });
          }
        }
        resolvedCategoryIds = [resolvedL1Id, finalMapping.l2_id, finalMapping.l3_id || null].filter(Boolean) as number[];
      }
    }

    const productPayload: any = {
      sku: String(sku),
      title_zh: String(title),
      desc_zh: description ? String(description) : null,
      status: status === "published" ? "published" : "draft",
      cost_twd: toInt(cost_twd),
      wholesale_price_twd: toInt(wholesale_price_twd),
      retail_price_twd: toInt(retail_price_twd),
      specs: specs,
      original_url: original_url ? String(original_url) : null,
    };

    // 使用 upsert 處理重複 SKU (更新現有商品)
    const { data: product, error: pErr } = await admin
      .from("products")
      .upsert(productPayload, { onConflict: 'sku' })
      .select("id")
      .single();

    if (pErr) {
      // 若 upsert 失敗，可能是因為 unique constraint 但非 SKU (少見)，或是其他錯誤
      console.error("Upsert failed:", pErr);
      return NextResponse.json({ error: pErr.message }, { status: 400 });
    }
    const productId = product.id as number;

    // 清除舊有關聯資料 (為了確保資料一致性，先刪除再重新插入)
    const [delCategory, delTag, delImage, delVariant] = await Promise.all([
      admin.from("product_category_map").delete().eq("product_id", productId),
      admin.from("product_tag_map").delete().eq("product_id", productId),
      admin.from("product_images").delete().eq("product_id", productId),
      admin.from("product_variants").delete().eq("product_id", productId),
    ]);
    const delError = delCategory.error || delTag.error || delImage.error || delVariant.error;
    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 400 });
    }

    // 分類關聯
    if (Array.isArray(resolvedCategoryIds) && resolvedCategoryIds.length > 0) {
      const rows = resolvedCategoryIds
        .filter((x: any) => !!x)
        .map((cid: number) => ({ product_id: productId, category_id: cid }));
      if (rows.length > 0) {
        const { error: cErr } = await admin.from("product_category_map").insert(rows);
        if (cErr) {
          return NextResponse.json({ error: cErr.message }, { status: 400 });
        }
      }
    }

    // 標籤關聯
    if (Array.isArray(tag_ids) && tag_ids.length > 0) {
      const rows = tag_ids.map((tid: number) => ({ product_id: productId, tag_id: tid }));
      const { error: tErr } = await admin.from("product_tag_map").insert(rows);
      if (tErr) {
        return NextResponse.json({ error: tErr.message }, { status: 400 });
      }
    }

    // 圖片
    if (Array.isArray(image_urls) && image_urls.length > 0) {
      const rows = image_urls.map((url: string, idx: number) => ({ product_id: productId, url, sort: idx }));
      const { error: iErr } = await admin.from("product_images").insert(rows);
      if (iErr) {
        return NextResponse.json({ error: iErr.message }, { status: 400 });
      }
    }

    // 變體
    if (Array.isArray(variants) && variants.length > 0) {
      const rows = variants.map((v: any) => ({
        product_id: productId,
        name: v.name,
        options: v.options,
        price: toInt(v.price),
        stock: toInt(v.stock),
        sku: v.sku
      }));
      const { error: vErr } = await admin.from("product_variants").insert(rows);
      if (vErr) {
        return NextResponse.json({ error: vErr.message }, { status: 400 });
      }
    }

    return NextResponse.json({ id: productId });
  } catch (err) {
    console.error("POST /api/publish-product error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
