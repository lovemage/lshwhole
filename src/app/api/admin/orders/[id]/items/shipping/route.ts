import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // order_id
    const admin = supabaseAdmin();
    const body = await request.json();
    const { item_id, shipping_fee_intl, shipping_fee_domestic } = body;

    if (!item_id) {
      return NextResponse.json({ error: "缺少必要參數 (item_id)" }, { status: 400 });
    }

    // Verify order item exists and belongs to order
    const { data: orderItem, error: itemError } = await admin
      .from("order_items")
      .select("id")
      .eq("id", item_id)
      .eq("order_id", id)
      .single();

    if (itemError || !orderItem) {
      return NextResponse.json({ error: "訂單項目不存在" }, { status: 404 });
    }

    // Prepare update object
    const updates: any = {};
    if (typeof shipping_fee_intl === "number") updates.shipping_fee_intl = shipping_fee_intl;
    if (typeof shipping_fee_domestic === "number") updates.shipping_fee_domestic = shipping_fee_domestic;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "未提供運費更新數值" }, { status: 400 });
    }

    // Update item
    const { error: updateError } = await admin
      .from("order_items")
      .update(updates)
      .eq("id", item_id);

    if (updateError) {
      return NextResponse.json({ error: "更新運費失敗" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Update item shipping error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
