import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
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
    await Promise.all([
      admin.from("product_category_map").delete().eq("product_id", productId),
      admin.from("product_tag_map").delete().eq("product_id", productId),
      admin.from("product_images").delete().eq("product_id", productId),
      admin.from("product_variants").delete().eq("product_id", productId),
    ]);

    // 分類關聯
    if (Array.isArray(category_ids) && category_ids.length > 0) {
      const rows = category_ids
        .filter((x: any) => !!x)
        .map((cid: number) => ({ product_id: productId, category_id: cid }));
      if (rows.length > 0) {
        const { error: cErr } = await admin.from("product_category_map").insert(rows);
        if (cErr) console.error("Category insert failed:", cErr);
      }
    }

    // 標籤關聯
    if (Array.isArray(tag_ids) && tag_ids.length > 0) {
      const rows = tag_ids.map((tid: number) => ({ product_id: productId, tag_id: tid }));
      const { error: tErr } = await admin.from("product_tag_map").insert(rows);
      if (tErr) console.error("Tag insert failed:", tErr);
    }

    // 圖片
    if (Array.isArray(image_urls) && image_urls.length > 0) {
      const rows = image_urls.map((url: string, idx: number) => ({ product_id: productId, url, sort: idx }));
      const { error: iErr } = await admin.from("product_images").insert(rows);
      if (iErr) console.error("Image insert failed:", iErr);
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
      if (vErr) console.error("Variant insert failed:", vErr);
    }

    return NextResponse.json({ id: productId });
  } catch (err) {
    console.error("POST /api/publish-product error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
