import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import {
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

    if (!sku || !title) {
      return NextResponse.json({ error: "缺少必要欄位：sku, title" }, { status: 400 });
    }

    // 保證 TWD 為整數
    const toInt = (v: any) => (v === null || v === undefined || v === "" ? null : Math.floor(Number(v)));

    let resolvedCategoryIds = (Array.isArray(category_ids) ? category_ids.filter((x: any) => !!x) : []) as number[];
    const directoryUrl =
      detectDosoDirectoryUrl(
        typeof source_directory_url === "string" ? source_directory_url : null
      ) ||
      (typeof source_directory_url === "string" && source_directory_url.trim()) ||
      detectDosoDirectoryUrl(original_url);

    if (directoryUrl) {
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
        resolvedCategoryIds = [finalMapping.l1_id, finalMapping.l2_id, finalMapping.l3_id || null].filter(Boolean) as number[];
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
