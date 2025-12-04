import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") || "100";
    const offset = searchParams.get("offset") || "0";
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("category_id");
    const idsParam = searchParams.get("ids");

    let query = admin
      .from("products")
      .select("id, sku, title_zh, title_original, desc_zh, desc_original, retail_price_twd, wholesale_price_twd, cost_twd, status, created_at, product_images(url, sort), product_tag_map(tag_id, tags(id, name, slug, category, sort))", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (search) {
      query = query.or(`sku.ilike.%${search}%,title_zh.ilike.%${search}%,title_original.ilike.%${search}%`);
    }

    if (categoryId) {
      // 需要通過 product_category_map 表進行關聯查詢
      const { data: productIds } = await admin
        .from("product_category_map")
        .select("product_id")
        .eq("category_id", categoryId);

      if (productIds && productIds.length > 0) {
        const ids = productIds.map((p: any) => p.product_id);
        query = query.in("id", ids);
      } else {
        return NextResponse.json({ data: [], count: 0 });
      }
    }

    if (idsParam) {
      const ids = idsParam.split(",").map(id => id.trim()).filter(Boolean);
      if (ids.length > 0) {
        query = query.in("id", ids);
      }
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Process data to add cover_image_url and tags
    const processedData = (data || []).map((p: any) => {
      let coverImage = null;
      if (p.product_images && Array.isArray(p.product_images) && p.product_images.length > 0) {
        const sortedImages = p.product_images.sort((a: any, b: any) => (a.sort || 0) - (b.sort || 0));
        coverImage = sortedImages[0].url;
      }

      // Extract tags from product_tag_map
      const tags = (p.product_tag_map || [])
        .filter((pt: any) => pt.tags)
        .map((pt: any) => pt.tags)
        .sort((a: any, b: any) => (a.sort || 0) - (b.sort || 0));

      return {
        ...p,
        cover_image_url: coverImage,
        tags: tags,
        product_images: undefined, // Remove raw images array
        product_tag_map: undefined // Remove raw tag map
      };
    });

    return NextResponse.json({ data: processedData, count: count || 0 });
  } catch (err) {
    console.error("GET /api/products error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const body = await request.json();
    
    // Extract images from body if present
    const { images, ...productData } = body;

    const { data, error } = await admin
      .from("products")
      .insert(productData)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const newProduct = data[0];

    // Insert images if present
    if (images && Array.isArray(images) && images.length > 0) {
      const imageInserts = images.map((img: any) => ({
        product_id: newProduct.id,
        url: img.url,
        sort: img.sort || 0
      }));

      const { error: imgError } = await admin
        .from("product_images")
        .insert(imageInserts);

      if (imgError) {
        console.error("Error inserting images:", imgError);
        // Continue anyway, product is created
      }
    }

    return NextResponse.json(newProduct, { status: 201 });
  } catch (err) {
    console.error("POST /api/products error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
