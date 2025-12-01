import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    let query = admin
      .from("tags")
      .select("*")
      .eq("active", true);

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query.order("sort", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("GET /api/tags error:", err);
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
    const { slug, name, sort, description, category } = body;

    if (!slug || !name) {
      return NextResponse.json(
        { error: "Missing required fields: slug, name" },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from("tags")
      .insert({
        slug: slug.toUpperCase(),
        name,
        sort: sort || 0,
        description: description || "",
        category: category || "A2", // Default to A2 (Product Attribute)
        active: true,
      })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data[0], { status: 201 });
  } catch (err) {
    console.error("POST /api/tags error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
