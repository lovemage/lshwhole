import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = supabaseAdmin();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "4"), 12);

    // 1. 獲取當前商品的所有分類
    const { data: currentProductCategories, error: catError } = await admin
      .from("product_category_map")
      .select("category_id")
      .eq("product_id", id);

    if (catError) {
      console.error("Error fetching current product categories:", catError);
      return NextResponse.json({ error: catError.message }, { status: 400 });
    }

    if (!currentProductCategories || currentProductCategories.length === 0) {
      // 如果當前商品沒有分類，返回隨機商品
      return getRandomProducts(admin, id, limit);
    }

    const currentCategoryIds = currentProductCategories.map(c => c.category_id);

    // 2. 獲取分類資訊，找出 L2 分類
    const { data: categories, error: catInfoError } = await admin
      .from("categories")
      .select("id, level")
      .in("id", currentCategoryIds);

    if (catInfoError) {
      console.error("Error fetching category info:", catInfoError);
      return getRandomProducts(admin, id, limit);
    }

    // 找出 L2 分類
    const l2Categories = categories?.filter(c => c.level === 2) || [];
    
    if (l2Categories.length === 0) {
      // 如果沒有 L2 分類，返回隨機商品
      return getRandomProducts(admin, id, limit);
    }

    // 3. 從 L2 分類中獲取相關商品
    const l2CategoryIds = l2Categories.map(c => c.id);
    
    // 獲取同 L2 分類的其他商品
    const { data: relatedProductIds, error: relatedError } = await admin
      .from("product_category_map")
      .select("product_id")
      .in("category_id", l2CategoryIds)
      .neq("product_id", id); // 排除當前商品

    if (relatedError) {
      console.error("Error fetching related product IDs:", relatedError);
      return getRandomProducts(admin, id, limit);
    }

    if (!relatedProductIds || relatedProductIds.length === 0) {
      // 如果沒有相關商品，返回隨機商品
      return getRandomProducts(admin, id, limit);
    }

    // 去重並隨機排序
    const uniqueProductIds = [...new Set(relatedProductIds.map(p => p.product_id))];
    const shuffledIds = shuffleArray(uniqueProductIds).slice(0, limit);

    // 4. 獲取商品詳細資訊
    const { data: products, error: productsError } = await admin
      .from("products")
      .select("id, sku, title_zh, title_original, retail_price_twd, status")
      .in("id", shuffledIds)
      .eq("status", "published");

    if (productsError) {
      console.error("Error fetching related products:", productsError);
      return NextResponse.json({ error: productsError.message }, { status: 400 });
    }

    // 5. 獲取商品封面圖片
    const productIds = (products || []).map((p: any) => p.id);
    let coverMap = new Map<number, string>();
    
    if (productIds.length > 0) {
      const { data: images, error: imgError } = await admin
        .from("product_images")
        .select("product_id, url, sort")
        .in("product_id", productIds);

      if (!imgError && images) {
        // 取每個商品 sort 最小的圖片作為封面
        const byProduct = new Map<number, { url: string; sort: number }>();
        images.forEach((img: any) => {
          const current = byProduct.get(img.product_id);
          if (!current || img.sort < current.sort) {
            byProduct.set(img.product_id, { url: img.url, sort: img.sort ?? 0 });
          }
        });
        coverMap = new Map(
          Array.from(byProduct.entries()).map(([pid, v]) => [pid, v.url])
        );
      }
    }

    // 6. 組裝結果
    const result = (products || []).map((p: any) => ({
      id: p.id,
      title: p.title_zh || p.title_original || p.sku,
      retail_price_twd: p.retail_price_twd,
      cover_image_url: coverMap.get(p.id) || null,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/products/[id]/related error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// 獲取隨機商品的輔助函數
async function getRandomProducts(admin: any, excludeId: string, limit: number) {
  try {
    const { data: products, error } = await admin
      .from("products")
      .select("id, sku, title_zh, title_original, retail_price_twd")
      .eq("status", "published")
      .neq("id", excludeId)
      .limit(limit * 3); // 獲取更多商品以便隨機選擇

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 隨機選擇商品
    const shuffled = shuffleArray(products || []).slice(0, limit);
    const productIds = shuffled.map((p: any) => p.id);

    // 獲取封面圖片
    let coverMap = new Map<number, string>();
    if (productIds.length > 0) {
      const { data: images } = await admin
        .from("product_images")
        .select("product_id, url, sort")
        .in("product_id", productIds);

      if (images) {
        const byProduct = new Map<number, { url: string; sort: number }>();
        images.forEach((img: any) => {
          const current = byProduct.get(img.product_id);
          if (!current || img.sort < current.sort) {
            byProduct.set(img.product_id, { url: img.url, sort: img.sort ?? 0 });
          }
        });
        coverMap = new Map(
          Array.from(byProduct.entries()).map(([pid, v]) => [pid, v.url])
        );
      }
    }

    const result = shuffled.map((p: any) => ({
      id: p.id,
      title: p.title_zh || p.title_original || p.sku,
      retail_price_twd: p.retail_price_twd,
      cover_image_url: coverMap.get(p.id) || null,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("Error in getRandomProducts:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// 數組隨機排序輔助函數
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
