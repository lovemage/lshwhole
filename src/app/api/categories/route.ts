import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const { searchParams } = new URL(request.url);
    const level = searchParams.get("level");

    let query = admin.from("categories").select("*").eq("active", true);

    if (level) {
      query = query.eq("level", parseInt(level));
    }

    const { data, error } = await query
      .order("level", { ascending: true })
      .order("sort", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("GET /api/categories error:", err);
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
    const { slug, name, level, sort, description, icon, retail_visible } = body;

    if (!slug || !name || level === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: slug, name, level" },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from("categories")
      .insert({
        slug: slug.toUpperCase(),
        name,
        level,
        sort: sort || 0,
        description: description || "",
        icon: icon || null,
        // 若前端未傳，預設零售可見
        retail_visible: retail_visible ?? true,
        active: true,
      })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data[0], { status: 201 });
  } catch (err) {
    console.error("POST /api/categories error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const body = await request.json();
    const { id, slug, name, level, sort, description, icon, retail_visible } = body;

    if (!id || !slug || !name || level === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: id, slug, name, level" },
        { status: 400 }
      );
    }

    const updatePayload: any = {
      slug: slug.toUpperCase(),
      name,
      level,
      sort: sort || 0,
      description: description || "",
      icon: icon || null,
      updated_at: new Date().toISOString(),
    };

    if (retail_visible !== undefined) {
      updatePayload.retail_visible = !!retail_visible;
    }

    const { data, error } = await admin
      .from("categories")
      .update(updatePayload)
      .eq("id", id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PUT /api/categories error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

