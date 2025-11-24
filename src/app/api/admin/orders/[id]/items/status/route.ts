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
    const { item_id, status } = body;

    if (!item_id || !status) {
      return NextResponse.json({ error: "缺少必要參數" }, { status: 400 });
    }

    // Validate status
    const validStatuses = [
      "NORMAL",
      "ALLOCATED",
      "IN_TRANSIT",
      "ARRIVED",
      "SHIPPED",
      "RECEIVED",
      "DELIVERY_FAILED",
      "OUT_OF_STOCK",
      "PARTIAL_OOS"
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "無效的狀態" }, { status: 400 });
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

    // Update status
    const { error: updateError } = await admin
      .from("order_items")
      .update({ status })
      .eq("id", item_id);

    if (updateError) {
      return NextResponse.json({ error: "更新狀態失敗" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Update item status error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
