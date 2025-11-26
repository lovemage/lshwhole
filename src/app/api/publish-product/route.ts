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
    };

    const { data: product, error: pErr } = await admin
      .from("products")
      .insert(productPayload)
      .select("id")
      .single();

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });
    const productId = product.id as number;

    // 分類關聯
    if (Array.isArray(category_ids) && category_ids.length > 0) {
      const rows = category_ids
        .filter((x: any) => !!x)
        .map((cid: number) => ({ product_id: productId, category_id: cid }));
      if (rows.length > 0) {
        const { error: cErr } = await admin.from("product_category_map").insert(rows);
        if (cErr) return NextResponse.json({ error: cErr.message }, { status: 400 });
      }
    }

    // 標籤關聯
    if (Array.isArray(tag_ids) && tag_ids.length > 0) {
      const rows = tag_ids.map((tid: number) => ({ product_id: productId, tag_id: tid }));
      const { error: tErr } = await admin.from("product_tag_map").insert(rows);
      if (tErr) return NextResponse.json({ error: tErr.message }, { status: 400 });
    }

    // 圖片
    if (Array.isArray(image_urls) && image_urls.length > 0) {
      const rows = image_urls.map((url: string, idx: number) => ({ product_id: productId, url, sort: idx }));
      const { error: iErr } = await admin.from("product_images").insert(rows);
      if (iErr) return NextResponse.json({ error: iErr.message }, { status: 400 });
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
      if (vErr) return NextResponse.json({ error: "Failed to insert variants: " + vErr.message }, { status: 400 });
    }

    return NextResponse.json({ id: productId });
  } catch (err) {
    console.error("POST /api/publish-product error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

