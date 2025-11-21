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

    let query = admin
      .from("products")
      .select("id, sku, title_zh, title_original, desc_zh, desc_original, retail_price_twd, wholesale_price_twd, cost_twd, status, created_at", { count: "exact" })
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

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: data || [], count: count || 0 });
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

    const { data, error } = await admin
      .from("products")
      .insert(body)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data[0], { status: 201 });
  } catch (err) {
    console.error("POST /api/products error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

