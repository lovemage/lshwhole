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
          sku
        )
      `)
      .eq("order_id", id);

    if (itemsError) {
      console.error("Error fetching order items:", itemsError);
    }

    // Fetch product images
    let imageMap = new Map<number, string[]>();
    if (items && items.length > 0) {
      const productIds = items.map((item: any) => item.product_id).filter(Boolean);
      if (productIds.length > 0) {
        const { data: imgs, error: imgErr } = await admin
          .from("product_images")
          .select("product_id, url, sort")
          .in("product_id", productIds)
          .order("sort", { ascending: true });

        if (!imgErr && imgs) {
          const byProduct = new Map<number, { url: string; sort: number }[]>();
          imgs.forEach((img: any) => {
            if (!byProduct.has(img.product_id)) {
              byProduct.set(img.product_id, []);
            }
            byProduct.get(img.product_id)!.push({ url: img.url, sort: img.sort });
          });

          // Sort images by sort order and take URLs
          byProduct.forEach((images, productId) => {
            const sortedUrls = images
              .sort((a, b) => a.sort - b.sort)
              .map(img => img.url);
            imageMap.set(productId, sortedUrls);
          });
        }
      }
    }

    // Add images to items
    const itemsWithImages = (items || []).map((item: any) => {
      // Handle case where product might be an array (one-to-many inference) or null
      const productData = Array.isArray(item.product) ? item.product[0] : item.product;
      
      return {
        ...item,
        product: {
          ...(productData || {}),
          images: imageMap.get(item.product_id) || []
        }
      };
    });

    return NextResponse.json({
      ...order,
      user_email: profile?.email,
      user_display_name: profile?.display_name,
      items: itemsWithImages,
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

    // Handle Status Change Logic
    if (status !== undefined) {
      const { data: currentOrder } = await admin
        .from("orders")
        .select("status, user_id, total_twd")
        .eq("id", id)
        .single();

      if (!currentOrder) {
        return NextResponse.json({ error: "訂單不存在" }, { status: 404 });
      }

      // Prevent changing from CANCELLED
      if (currentOrder.status === "CANCELLED" && status !== "CANCELLED") {
        return NextResponse.json({ error: "已取消的訂單無法更改狀態" }, { status: 400 });
      }

      // Handle Cancellation Refund
      if (status === "CANCELLED" && currentOrder.status !== "CANCELLED") {
        // Refund to wallet
        const { data: wallet } = await admin
          .from("wallets")
          .select("balance_twd")
          .eq("user_id", currentOrder.user_id)
          .single();

        if (wallet) {
          const refundAmount = currentOrder.total_twd;
          const newBalance = wallet.balance_twd + refundAmount;

          // Update Wallet
          await admin
            .from("wallets")
            .update({
              balance_twd: newBalance,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", currentOrder.user_id);

          // Create Ledger
          await admin.from("wallet_ledger").insert({
            user_id: currentOrder.user_id,
            type: "REFUND",
            amount_twd: refundAmount,
            charge_type: "ORDER_CANCEL",
            external_ref: `ORDER_CANCEL_${id}_${Date.now()}`,
            note: `訂單 #${id} 取消退款`
          });
        }
      }
    }

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
