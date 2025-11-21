import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const body = await request.json();
    const { action, ids, active, status } = body || {};

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "缺少 ids" }, { status: 400 });
    }

    if (action === "status") {
      // schema 使用 status: 'draft'|'published'
      const newStatus = status === "published" ? "published" : "draft";
      const { error } = await admin
        .from("products")
        .update({ status: newStatus })
        .in("id", ids);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const { error } = await admin
        .from("products")
        .delete()
        .in("id", ids);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "未知動作" }, { status: 400 });
  } catch (err) {
    console.error("POST /api/products/batch error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

