import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const admin = supabaseAdmin();

    const { data, error } = await admin
      .from("tags")
      .select("*")
      .eq("active", true)
      .order("sort", { ascending: true });

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
    const { slug, name, sort, description } = body;

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

