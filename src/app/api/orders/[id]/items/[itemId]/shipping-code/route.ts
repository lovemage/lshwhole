import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    const body = await request.json();
    const { shipping_code } = body;

    if (!shipping_code) {
      return NextResponse.json({ error: "請輸入寄件編號" }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const authHeader = request.headers.get("Authorization");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!authHeader?.startsWith("Bearer ") || !supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    // Verify ownership
    const { data: item, error: itemError } = await admin
      .from("order_items")
      .select("id, orders!inner(user_id)")
      .eq("id", itemId)
      .eq("order_id", id)
      .eq("orders.user_id", user.id)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: "找不到商品或無權限" }, { status: 404 });
    }

    // Update
    const { error: updateError } = await admin
      .from("order_items")
      .update({
        member_shipping_code: shipping_code,
        updated_at: new Date().toISOString()
      })
      .eq("id", itemId);

    if (updateError) {
      return NextResponse.json({ error: "更新失敗" }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Update member shipping code error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
