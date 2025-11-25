import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/admin/limited-time-products
 * Fetch all products marked as limited time
 */
export async function GET(request: NextRequest) {
  try {
    const admin = supabaseAdmin();

    const { data: products, error } = await admin
      .from("products")
      .select(`
        id,
        sku,
        title_zh,
        title_original,
        retail_price_twd,
        status,
        is_limited_time,
        limited_time_end,
        product_images (
          url,
          sort
        )
      `)
      .eq("is_limited_time", true)
      .order("limited_time_end", { ascending: true });

    if (error) {
      console.error("Error fetching limited time products:", error);
      return NextResponse.json({ error: "Failed to fetch limited time products" }, { status: 500 });
    }

    // Format images
    const formatted = products.map((p: any) => {
      let coverImage = null;
      if (p.product_images && p.product_images.length > 0) {
        const sorted = p.product_images.sort((a: any, b: any) => (a.sort || 0) - (b.sort || 0));
        coverImage = sorted[0].url;
      }
      return {
        ...p,
        cover_image_url: coverImage
      };
    });

    return NextResponse.json({ products: formatted });
  } catch (err) {
    console.error("GET /api/admin/limited-time-products error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/limited-time-products
 * Set products as limited time with an end date
 * Body: { product_ids: number[], end_time: string (ISO) }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { product_ids, end_time } = body;

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json({ error: "Product IDs required" }, { status: 400 });
    }

    if (!end_time) {
      return NextResponse.json({ error: "End time required" }, { status: 400 });
    }

    const admin = supabaseAdmin();

    const { error } = await admin
      .from("products")
      .update({
        is_limited_time: true,
        limited_time_end: end_time
      })
      .in("id", product_ids);

    if (error) {
      console.error("Error setting limited time products:", error);
      return NextResponse.json({ error: "Failed to update products" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/admin/limited-time-products error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/limited-time-products
 * Remove limited time status from products
 * Body: { product_ids: number[] }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { product_ids } = body;

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json({ error: "Product IDs required" }, { status: 400 });
    }

    const admin = supabaseAdmin();

    const { error } = await admin
      .from("products")
      .update({
        is_limited_time: false,
        limited_time_end: null
      })
      .in("id", product_ids);

    if (error) {
      console.error("Error removing limited time status:", error);
      return NextResponse.json({ error: "Failed to update products" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/admin/limited-time-products error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
