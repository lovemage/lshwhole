import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const { data, error } = await admin.from("shipping_settings").select("*");

    if (error) {
      return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }

    // Convert array to object
    const settings: Record<string, number> = {};
    data?.forEach((item: any) => {
      settings[item.key] = Number(item.value);
    });

    return NextResponse.json(settings);
  } catch (err) {
    console.error("GET shipping settings error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const body = await request.json();
    
    // body is expected to be an object like { rate_intl_kg: 200, ... }
    const updates = Object.entries(body).map(([key, value]) => ({
      key,
      value
    }));

    const { error } = await admin.from("shipping_settings").upsert(updates);

    if (error) {
      return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PUT shipping settings error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
