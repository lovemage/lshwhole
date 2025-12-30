import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ensureHttps = (url: string) => (url ? url.replace(/^http:/, "https:") : url);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = supabaseAdmin();
    const { id } = await params;
    const productId = Number(id);

    if (Number.isNaN(productId)) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("products")
      .select(
        "id, sku, title_zh, title_original, desc_zh, desc_original, retail_price_twd, wholesale_price_twd, cost_twd, status, created_at, updated_at, specs, original_url, product_images(url, sort, is_product, is_description), product_variants(id, name, options, price, stock, sku), product_tag_map(tag_id, tags(id, name, slug, category, sort)), product_category_map(category_id, categories(id, slug, name, level, sort))"
      )
      .eq("id", productId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const { data: imagesRawRaw, error: imgError } = await admin
      .from("product_images")
      .select("url, sort, is_product, is_description")
      .eq("product_id", productId)
      .order("sort", { ascending: true });

    let imagesRaw = imagesRawRaw;

    if (imgError) {
      console.error("Error fetching product images for admin detail:", imgError);
    }

    // Fallback: some environments may have `product_id` stored/returned in a string-compatible format
    if ((!imagesRaw || imagesRaw.length === 0) && !imgError) {
      const retry = await admin
        .from("product_images")
        .select("url, sort, is_product, is_description")
        .eq("product_id", String(productId))
        .order("sort", { ascending: true });
      if (!retry.error && retry.data && retry.data.length > 0) {
        imagesRaw = retry.data;
      }
    }

    const variantsRaw = (data as any)?.product_variants || [];
    const tagMapRaw = (data as any)?.product_tag_map || [];
    const catMapRaw = (data as any)?.product_category_map || [];

    const imagesSource = (imagesRaw && imagesRaw.length > 0)
      ? imagesRaw
      : ((data as any)?.product_images || []);

    const images = (imagesSource || [])
      .map((img: any, idx: number) => ({
        url: ensureHttps(img.url),
        sort: img.sort ?? idx,
        is_product: img.is_product ?? true,
        is_description: img.is_description ?? false,
      }))
      .sort((a: any, b: any) => (a.sort || 0) - (b.sort || 0));

    const tags = (tagMapRaw || [])
      .filter((pt: any) => pt.tags)
      .map((pt: any) => pt.tags)
      .sort((a: any, b: any) => (a.sort || 0) - (b.sort || 0));

    const categories = (catMapRaw || [])
      .filter((pc: any) => pc.categories)
      .map((pc: any) => pc.categories)
      .sort((a: any, b: any) => (a.sort || 0) - (b.sort || 0));

    const l1 = categories.find((c: any) => c.level === 1)?.id ?? null;
    const l2 = categories.find((c: any) => c.level === 2)?.id ?? null;
    const l3 = categories.find((c: any) => c.level === 3)?.id ?? null;

    return NextResponse.json({
      id: (data as any).id,
      sku: (data as any).sku,
      title_zh: (data as any).title_zh,
      title_original: (data as any).title_original,
      desc_zh: (data as any).desc_zh,
      desc_original: (data as any).desc_original,
      retail_price_twd: (data as any).retail_price_twd,
      wholesale_price_twd: (data as any).wholesale_price_twd,
      cost_twd: (data as any).cost_twd,
      status: (data as any).status,
      created_at: (data as any).created_at,
      updated_at: (data as any).updated_at,
      specs: (data as any).specs,
      original_url: (data as any).original_url,
      images,
      variants: variantsRaw || [],
      tags,
      categories,
      l1Id: l1,
      l2Id: l2,
      l3Id: l3,
      category_ids: [l1, l2, l3].filter(Boolean),
      tag_ids: (tags || []).map((t: any) => t.id),
    });
  } catch (err) {
    console.error("GET /api/admin/products/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
