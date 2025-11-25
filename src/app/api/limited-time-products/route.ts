import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/limited-time-products
 * Fetch all ACTIVE limited time products (public)
 */
export async function GET(request: NextRequest) {
  try {
    const admin = supabaseAdmin();

    // Get current time in UTC ISO string
    const now = new Date().toISOString();

    const { data: products, error } = await admin
      .from("products")
      .select(`
        id,
        title_zh,
        title_original,
        retail_price_twd,
        wholesale_price_twd,
        is_limited_time,
        limited_time_end,
        status,
        product_images (
          url,
          sort
        )
      `)
      .eq("is_limited_time", true)
      .eq("status", "published")
      .gt("limited_time_end", now) // Only products that haven't expired
      .order("limited_time_end", { ascending: true });

    if (error) {
      console.error("Error fetching limited time products:", error);
      return NextResponse.json({ error: "Failed to fetch limited time products" }, { status: 500 });
    }

    // Format images
    const formatted = (products || []).map((p: any) => {
      let coverImage = null;
      if (p.product_images && p.product_images.length > 0) {
        const sorted = p.product_images.sort((a: any, b: any) => (a.sort || 0) - (b.sort || 0));
        coverImage = sorted[0].url;
      }
      return {
        id: p.id,
        title: p.title_zh || p.title_original || "未命名商品",
        retail_price_twd: p.retail_price_twd,
        wholesale_price_twd: p.wholesale_price_twd,
        cover_image_url: coverImage,
        limited_time_end: p.limited_time_end
      };
    });

    return NextResponse.json({ products: formatted });
  } catch (err) {
    console.error("GET /api/limited-time-products error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
