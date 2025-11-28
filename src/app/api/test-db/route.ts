import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const admin = supabaseAdmin();

    // Check existing types in wallet_ledger
    // Supabase JS doesn't support DISTINCT easily without RPC?
    // We can fetch all types (assuming not millions of rows yet) and dedupe in JS.
    const { data, error } = await admin
      .from("wallet_ledger")
      .select("type");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const types = [...new Set(data.map((row: any) => row.type))];

    return NextResponse.json({ success: true, existing_types: types });
  } catch (err) {
    console.error("Test DB error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
