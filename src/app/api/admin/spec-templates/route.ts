import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET - 獲取所有規格範本
export async function GET() {
  try {
    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from("spec_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("GET /api/admin/spec-templates error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - 創建新規格範本
export async function POST(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const body = await request.json();
    const { name, specs } = body;

    if (!name || !specs || !Array.isArray(specs)) {
      return NextResponse.json({ error: "name and specs are required" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("spec_templates")
      .insert({ name, specs })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("POST /api/admin/spec-templates error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - 更新規格範本
export async function PUT(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const body = await request.json();
    const { id, name, specs } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("spec_templates")
      .update({ name, specs, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PUT /api/admin/spec-templates error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - 刪除規格範本
export async function DELETE(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { error } = await admin
      .from("spec_templates")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/admin/spec-templates error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

