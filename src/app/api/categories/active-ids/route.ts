import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const admin = supabaseAdmin();

    // 查詢有主動上架商品的所有分類 ID
    const { data, error } = await admin
      .from("product_category_map")
      .select(`
        category_id,
        products!inner (
          status
        )
      `)
      .eq("products.status", "published");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 提取唯一的 category_id
    const categoryIds = Array.from(
      new Set(
        (data || [])
          .map((item: any) => Number(item.category_id))
          .filter((id: number) => !Number.isNaN(id))
      )
    );

    return NextResponse.json(categoryIds);
  } catch (err) {
    console.error("GET /api/categories/active-ids error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
