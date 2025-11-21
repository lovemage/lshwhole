import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/admin/hot-products
 * 管理員查詢所有熱銷商品
 */
export async function GET(request: NextRequest) {
  try {
    const admin = supabaseAdmin();

    // 查詢所有熱銷商品
    const { data: hotProducts, error: productsError } = await admin
      .from("products")
      .select("id, sku, title_zh, title_original, retail_price_twd, wholesale_price_twd, status, is_hot, hot_order, hot_marked_at")
      .eq("is_hot", true)
      .order("hot_order", { ascending: true })
      .order("hot_marked_at", { ascending: false });

    if (productsError) {
      console.error("查詢熱銷商品失敗:", productsError);
      return NextResponse.json({ error: "查詢熱銷商品失敗" }, { status: 500 });
    }

    return NextResponse.json({ products: hotProducts || [] });

  } catch (err) {
    console.error("GET /api/admin/hot-products error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/hot-products
 * 管理員批量設定熱銷商品
 * Body: { product_ids: number[], hot_order?: number[] }
 */
export async function POST(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const body = await request.json();
    const { product_ids } = body;

    if (!Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json({ error: "product_ids 必須為非空陣列" }, { status: 400 });
    }

    // 批量標記為熱銷商品
    const updates = product_ids.map((id, index) => ({
      id,
      is_hot: true,
      hot_order: index + 1,
      hot_marked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // 使用 upsert 批量更新
    const { error: updateError } = await admin
      .from("products")
      .upsert(updates, { onConflict: 'id' });

    if (updateError) {
      console.error("設定熱銷商品失敗:", updateError);
      return NextResponse.json({ error: "設定熱銷商品失敗" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `成功設定 ${product_ids.length} 個熱銷商品`,
    });

  } catch (err) {
    console.error("POST /api/admin/hot-products error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/hot-products
 * 管理員批量取消熱銷商品
 * Body: { product_ids: number[] }
 */
export async function DELETE(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const body = await request.json();
    const { product_ids } = body;

    if (!Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json({ error: "product_ids 必須為非空陣列" }, { status: 400 });
    }

    // 批量取消熱銷標記
    const { error: updateError } = await admin
      .from("products")
      .update({
        is_hot: false,
        hot_order: 0,
        hot_marked_at: null,
        updated_at: new Date().toISOString(),
      })
      .in("id", product_ids);

    if (updateError) {
      console.error("取消熱銷商品失敗:", updateError);
      return NextResponse.json({ error: "取消熱銷商品失敗" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `成功取消 ${product_ids.length} 個熱銷商品`,
    });

  } catch (err) {
    console.error("DELETE /api/admin/hot-products error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
