import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parent_id");
    const childId = searchParams.get("child_id");

    let query = admin
      .from("category_relations")
      .select("parent_category_id, child_category_id");

    if (parentId) {
      query = query.eq("parent_category_id", parentId);
    }
    if (childId) {
      query = query.eq("child_category_id", childId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("GET /api/category-relations error:", err);
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
    const { parent_id, child_id } = body;

    if (!parent_id || !child_id) {
      return NextResponse.json(
        { error: "Missing required fields: parent_id, child_id" },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from("category_relations")
      .insert({
        parent_category_id: parent_id,
        child_category_id: child_id,
      })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data[0], { status: 201 });
  } catch (err) {
    console.error("POST /api/category-relations error:", err);
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
    const { parent_id, child_id } = body;

    if (!parent_id || !child_id) {
      return NextResponse.json(
        { error: "Missing required fields: parent_id, child_id" },
        { status: 400 }
      );
    }

    const { error } = await admin
      .from("category_relations")
      .delete()
      .eq("parent_category_id", parent_id)
      .eq("child_category_id", child_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/category-relations error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

