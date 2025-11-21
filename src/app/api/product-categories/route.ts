import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("product_id");

    let query = admin
      .from("product_category_map")
      .select("product_id, category_id");

    if (productId) {
      query = query.eq("product_id", productId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("GET /api/product-categories error:", err);
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
    const { product_id, category_id } = body;

    if (!product_id || !category_id) {
      return NextResponse.json(
        { error: "Missing required fields: product_id, category_id" },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from("product_category_map")
      .insert({
        product_id,
        category_id,
      })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data[0], { status: 201 });
  } catch (err) {
    console.error("POST /api/product-categories error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const body = await request.json();
    const { product_id, category_id } = body;

    if (!product_id || !category_id) {
      return NextResponse.json(
        { error: "Missing required fields: product_id, category_id" },
        { status: 400 }
      );
    }

    const { error } = await admin
      .from("product_category_map")
      .delete()
      .eq("product_id", product_id)
      .eq("category_id", category_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/product-categories error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

