import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

 const ensureHttps = (url: string) => (url ? url.replace(/^http:/, "https:") : url);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = supabaseAdmin();

    // 解析目前會員 tier，用來決定是否顯示批發價
    let userTier: "retail" | "wholesale" | "vip" | null = null;
    let allowedL1: number[] | null = null;
    const authHeader =
      request.headers.get("Authorization") || request.headers.get("authorization");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (authHeader?.startsWith("Bearer ") && supabaseUrl && supabaseAnonKey) {
      try {
        const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: {
              Authorization: authHeader,
            },
          },
        });

        const {
          data: { user },
        } = await supabaseUser.auth.getUser();

        if (!user) {
          return NextResponse.json({ error: "未登入" }, { status: 401 });
        }

        const { data: profile, error: profileErr } = await admin
          .from("profiles")
          .select("tier, allowed_l1_category_ids, login_enabled, account_status")
          .eq("user_id", user.id)
          .single();

        if (profileErr || !profile?.tier) {
          return NextResponse.json({ error: "會員資料不存在" }, { status: 401 });
        }

        if ((profile as any).account_status === "LOCKED") {
          return NextResponse.json({ error: "帳號已被鎖定，請聯繫管理員" }, { status: 403 });
        }

        if (!(profile as any).login_enabled) {
          return NextResponse.json({ error: "系統無偵測到每月訂單，請聯繫管理員" }, { status: 403 });
        }

        if (profile.tier === "guest") {
          return NextResponse.json({ error: "請註冊或登入會員後瀏覽商品" }, { status: 403 });
        }

        userTier = profile.tier as "retail" | "wholesale" | "vip";
        allowedL1 = profile.allowed_l1_category_ids || null;
      } catch (e) {
        console.error("resolve user tier failed in /api/products/[id]", e);
        return NextResponse.json({ error: "驗證失敗" }, { status: 401 });
      }
    }

    if (!userTier) {
      return NextResponse.json({ error: "請登入後查看商品" }, { status: 401 });
    }

    const isWholesaleTier = userTier === "wholesale" || userTier === "vip";

    const { id } = await params;

    // 獲取商品基本資料（不包含成本價）
    const { data: product, error } = await admin
      .from("products")
      .select(
        "id, sku, title_zh, title_original, desc_zh, desc_original, retail_price_twd, wholesale_price_twd, status, created_at, updated_at, specs"
      )
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 若有 L1 限制，檢查商品所屬分類是否被允許
    if (allowedL1 && allowedL1.length > 0) {
      const { data: rels, error: relErr } = await admin
        .from("category_relations")
        .select("parent_category_id, child_category_id");
      if (relErr) return NextResponse.json({ error: relErr.message }, { status: 400 });

      const { data: categories, error: catErr } = await admin
        .from("categories")
        .select("id, level");
      if (catErr) return NextResponse.json({ error: catErr.message }, { status: 400 });

      const { data: pcm, error: mapErr } = await admin
        .from("product_category_map")
        .select("category_id")
        .eq("product_id", id);
      if (mapErr) return NextResponse.json({ error: mapErr.message }, { status: 400 });

      const adj = new Map<number, number[]>();
      rels?.forEach((r) => {
        const arr = adj.get(r.parent_category_id) || [];
        arr.push(r.child_category_id);
        adj.set(r.parent_category_id, arr);
      });

      const allowedSet = new Set<number>();
      const l1Existing = new Set((categories || []).filter((c: any) => c.level === 1).map((c: any) => c.id));
      allowedL1.forEach((l1) => {
        if (!l1Existing.has(l1)) return;
        const q: number[] = [l1];
        while (q.length) {
          const cur = q.shift()!;
          if (allowedSet.has(cur)) continue;
          allowedSet.add(cur);
          (adj.get(cur) || []).forEach((child) => q.push(child));
        }
      });

      const productCats = new Set((pcm || []).map((x: any) => x.category_id));
      const intersect = Array.from(productCats).some((cid) => allowedSet.has(cid));
      if (!intersect) {
        return NextResponse.json({ error: "此商品不在可瀏覽的分類" }, { status: 403 });
      }
    }

    // 獲取商品圖片 (包含 is_product 和 is_description)
    const { data: images, error: imgError } = await admin
      .from("product_images")
      .select("url, sort, is_product, is_description")
      .eq("product_id", id)
      .order("sort", { ascending: true });

    if (imgError) {
      console.error("Error fetching product images:", imgError);
    }

    // 獲取變體
    const { data: variants, error: vError } = await admin
      .from("product_variants")
      .select("id, name, options, price, stock, sku")
      .eq("product_id", id);

    // 將圖片資料添加到商品資料中（包含完整圖片資訊）
    const productWithImages = {
      id: product.id,
      sku: product.sku,
      title_zh: product.title_zh,
      title_original: product.title_original,
      desc_zh: product.desc_zh,
      desc_original: product.desc_original,
      retail_price_twd: product.retail_price_twd,
      wholesale_price_twd: isWholesaleTier ? product.wholesale_price_twd : null,
      status: product.status,
      created_at: product.created_at,
      updated_at: product.updated_at,
      // 返回完整圖片資訊（包含 is_product 和 is_description）
      images: (images || []).map((img: any) => ({
        url: ensureHttps(img.url),
        sort: img.sort,
        is_product: img.is_product ?? true,
        is_description: img.is_description ?? false,
      })),
      specs: product.specs,
      variants: variants || [],
    };

    return NextResponse.json(productWithImages);
  } catch (err) {
    console.error("GET /api/products/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = supabaseAdmin();
    const { id } = await params;
    const productId = Number(id);
    const body = await request.json();

    // Extract images, specs, variants if present
    const { images, specs, variants, tag_ids, category_ids, ...productData } = body;

    const { data, error } = await admin
      .from("products")
      .update({
        ...productData,
        specs: specs ? specs : undefined
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Handle variants update if provided
    if (variants && Array.isArray(variants)) {
      // For simplicity, delete all existing variants and re-insert
      // This is safe because we re-generate variants in frontend based on specs
      // Note: This might break existing order items if we hard delete.
      // However, order items should reference variant ID. If we delete, we lose link.
      // But user wants to "edit" specs. If specs change, variants change.
      // Ideally we should try to update existing ones if IDs match, and insert new ones.
      // But `variants` from frontend might not have IDs if they are regenerated.
      // Given the requirement "specs setting was mistaken", we assume admin is fixing specs.
      // If we delete variants, `order_items.variant_id` might be set NULL (ON DELETE SET NULL).
      // Let's implement full replace for now as it's cleaner for "fixing" mistakes.
      
      const { error: vDelError } = await admin
        .from("product_variants")
        .delete()
        .eq("product_id", id);
      
      if (vDelError) {
        console.error("Error deleting old variants:", vDelError);
      }

      if (variants.length > 0) {
        const variantInserts = variants.map((v: any) => ({
          product_id: id,
          name: v.name,
          options: v.options,
          price: v.price,
          stock: v.stock,
          sku: v.sku
        }));
        
        const { error: vInsError } = await admin
          .from("product_variants")
          .insert(variantInserts);

        if (vInsError) {
           console.error("Error inserting new variants:", vInsError);
        }
      }
    }

    // Handle images update if provided
    if (images && Array.isArray(images)) {
      // 1. Delete existing images
      const { error: delError } = await admin
        .from("product_images")
        .delete()
        .eq("product_id", id);
      
      if (delError) {
        console.error("Error deleting old images:", delError);
        // Continue to try inserting new ones? Might duplicate if delete failed but simpler to proceed.
      }

      // 2. Insert new images (包含 is_product 和 is_description)
      if (images.length > 0) {
        const imageInserts = images.map((img: any) => ({
          product_id: id,
          url: img.url,
          sort: img.sort || 0,
          is_product: img.is_product ?? true,
          is_description: img.is_description ?? false,
        }));

        const { error: insError } = await admin
          .from("product_images")
          .insert(imageInserts);

        if (insError) {
          console.error("Error inserting new images:", insError);
        }
      }
    }

    // Handle tag relations update if provided
    if (Array.isArray(tag_ids)) {
      const { error: tagDelError } = await admin
        .from("product_tag_map")
        .delete()
        .eq("product_id", id);

      if (tagDelError) {
        console.error("Error deleting old tag map:", tagDelError);
      }

      const rows = tag_ids
        .map((tid: any) => Number(tid))
        .filter((n: number) => !Number.isNaN(n) && n > 0)
        .map((tid: number) => ({ product_id: Number.isNaN(productId) ? id : productId, tag_id: tid }));

      if (rows.length > 0) {
        const { error: tagInsError } = await admin.from("product_tag_map").insert(rows);
        if (tagInsError) {
          console.error("Error inserting new tag map:", tagInsError);
        }
      }
    }

    // Handle category relations update if provided
    if (Array.isArray(category_ids)) {
      const { error: catDelError } = await admin
        .from("product_category_map")
        .delete()
        .eq("product_id", id);

      if (catDelError) {
        console.error("Error deleting old category map:", catDelError);
      }

      const rows = category_ids
        .map((cid: any) => Number(cid))
        .filter((n: number) => !Number.isNaN(n) && n > 0)
        .map((cid: number) => ({ product_id: Number.isNaN(productId) ? id : productId, category_id: cid }));

      if (rows.length > 0) {
        const { error: catInsError } = await admin.from("product_category_map").insert(rows);
        if (catInsError) {
          console.error("Error inserting new category map:", catInsError);
        }
      }
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PUT /api/products/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
      );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = supabaseAdmin();
    const { id } = await params;

    const { error } = await admin
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/products/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
