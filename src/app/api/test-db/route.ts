import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const admin = supabaseAdmin();

    // Test database connection
    const { data, error } = await admin
      .from("orders")
      .select("id")
      .limit(1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Database connection successful" });
  } catch (err) {
    console.error("Test DB error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
