import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = supabaseAdmin();

    const { data: order, error } = await admin
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Fetch user profile
    const { data: profile } = await admin
      .from("profiles")
      .select("email, display_name")
      .eq("user_id", order.user_id)
      .single();

    // Fetch order items with product details
    const { data: items, error: itemsError } = await admin
      .from("order_items")
      .select(`
        *,
        product:products (
          id,
          title_zh,
          title_original,
          sku,
          images
        )
      `)
      .eq("order_id", id);

    if (itemsError) {
      console.error("Error fetching order items:", itemsError);
    }

    return NextResponse.json({
      ...order,
      user_email: profile?.email,
      user_display_name: profile?.display_name,
      items: items || [],
    });
  } catch (err) {
    console.error("GET order detail error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = supabaseAdmin();
    const body = await request.json();

    const {
      status,
      shipping_fee_intl,
      box_fee,
      box_count,
      tracking_number,
      shipping_method,
      recipient_name,
      recipient_phone,
      shipping_address,
    } = body;

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (shipping_fee_intl !== undefined) updateData.shipping_fee_intl = shipping_fee_intl;
    if (box_fee !== undefined) updateData.box_fee = box_fee;
    if (box_count !== undefined) updateData.box_count = box_count;
    if (tracking_number !== undefined) updateData.tracking_number = tracking_number;
    if (shipping_method !== undefined) updateData.shipping_method = shipping_method;
    if (recipient_name !== undefined) updateData.recipient_name = recipient_name;
    if (recipient_phone !== undefined) updateData.recipient_phone = recipient_phone;
    if (shipping_address !== undefined) updateData.shipping_address = shipping_address;

    updateData.updated_at = new Date().toISOString();

    const { error } = await admin
      .from("orders")
      .update(updateData)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PUT order update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
