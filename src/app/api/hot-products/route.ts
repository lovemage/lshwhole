import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/hot-products
 * 查詢熱銷商品列表（公開 API，所有會員可訪問）
 */
export async function GET(request: NextRequest) {
  try {
    const admin = supabaseAdmin();

    // 查詢標記為熱銷的商品，並關聯取得圖片
    const { data: hotProducts, error: productsError } = await admin
      .from("products")
      .select(`
        id,
        title_zh,
        title_original,
        retail_price_twd,
        wholesale_price_twd,
        is_hot,
        hot_order,
        status,
        product_images (
          url,
          sort
        )
      `)
      .eq("is_hot", true)
      .eq("status", "published")
      .order("hot_order", { ascending: true })
      .order("hot_marked_at", { ascending: false });

    if (productsError) {
      console.error("查詢熱銷商品失敗:", productsError);
      return NextResponse.json({ error: "查詢熱銷商品失敗" }, { status: 500 });
    }

    // 轉換格式以符合前端預期
    const formattedProducts = (hotProducts || []).map((p: any) => {
      // 取得第一張圖片作為封面
      let coverImage = null;
      if (p.product_images && Array.isArray(p.product_images) && p.product_images.length > 0) {
        // 根據 sort 排序，取第一個
        const sortedImages = p.product_images.sort((a: any, b: any) => (a.sort || 0) - (b.sort || 0));
        coverImage = sortedImages[0].url;
      }

      return {
        id: p.id,
        title: p.title_zh || p.title_original || "未命名商品",
        retail_price_twd: p.retail_price_twd,
        wholesale_price_twd: p.wholesale_price_twd, // 前端頁面可能需要此欄位顯示批發價
        cover_image_url: coverImage,
      };
    });

    return NextResponse.json({ products: formattedProducts });

  } catch (err) {
    console.error("GET /api/hot-products error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
