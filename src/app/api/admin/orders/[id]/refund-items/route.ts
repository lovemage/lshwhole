import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // order_id
    const admin = supabaseAdmin();
    const body = await request.json();
    const { items, reason } = body;
    // items: [{ item_id: number, refund_qty: number }]

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "無退款項目" }, { status: 400 });
    }

    // 1. Fetch order to get user_id
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("user_id, status")
      .eq("id", id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "訂單不存在" }, { status: 404 });
    }

    let totalRefundAmount = 0;
    const processedItems: any[] = [];

    // 2. Validate items and calculate total
    for (const item of items) {
      const { item_id, refund_qty } = item;
      
      const { data: orderItem, error: itemError } = await admin
        .from("order_items")
        .select("*")
        .eq("id", item_id)
        .eq("order_id", id)
        .single();

      if (itemError || !orderItem) {
        return NextResponse.json({ error: `訂單項目 ${item_id} 不存在` }, { status: 400 });
      }

      if (refund_qty > orderItem.qty) {
        return NextResponse.json({ error: `退款數量不能大於訂購數量 (Item: ${item_id})` }, { status: 400 });
      }

      // Calculate refund for this item
      const itemRefund = Math.floor(orderItem.unit_price_twd * refund_qty);
      totalRefundAmount += itemRefund;

      processedItems.push({
        id: item_id,
        refund_qty,
        refund_amount: itemRefund,
        original_qty: orderItem.qty,
        unit_price_twd: orderItem.unit_price_twd,
        current_status: orderItem.status,
        current_refund: orderItem.refund_amount || 0
      });
    }

    if (totalRefundAmount <= 0) {
      return NextResponse.json({ error: "退款金額必須大於 0" }, { status: 400 });
    }

    // 3. Process Refund to Wallet
    // 3.1 Get user wallet
    const { data: wallet, error: walletError } = await admin
      .from("wallets")
      .select("balance_twd")
      .eq("user_id", order.user_id)
      .single();

    if (walletError || !wallet) {
      return NextResponse.json({ error: "用戶錢包不存在" }, { status: 400 });
    }

    // 3.2 Create Ledger Entry
    const externalRef = `REFUND_${id}_${Date.now()}`;
    const { error: ledgerError } = await admin
      .from("wallet_ledger")
      .insert({
        user_id: order.user_id,
        type: "REFUND",
        amount_twd: totalRefundAmount,
        charge_type: "PRODUCT", // Or create a new type 'REFUND'
        external_ref: externalRef,
        note: `訂單 #${id} 缺貨退款: ${reason || "管理員操作"}`
      });

    if (ledgerError) {
      return NextResponse.json({ error: "建立退款紀錄失敗: " + ledgerError.message }, { status: 500 });
    }

    // 3.3 Update Wallet Balance
    const newBalance = wallet.balance_twd + totalRefundAmount;
    const { error: updateWalletError } = await admin
      .from("wallets")
      .update({
        balance_twd: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", order.user_id);

    if (updateWalletError) {
      return NextResponse.json({ error: "更新錢包餘額失敗" }, { status: 500 });
    }

    // 4. Update Order Items Status
    for (const pItem of processedItems) {
      // Calculate total refunded amount including this transaction
      const newRefundAmount = (pItem.current_refund || 0) + pItem.refund_amount;
      const totalValue = pItem.original_qty * pItem.unit_price_twd;
      
      // Determine status
      let newStatus = "NORMAL";
      if (newRefundAmount >= totalValue) {
        newStatus = "OUT_OF_STOCK";
      } else if (newRefundAmount > 0) {
        newStatus = "PARTIAL_OOS";
      }
      
      await admin
        .from("order_items")
        .update({
          status: newStatus,
          refund_amount: newRefundAmount
        })
        .eq("id", pItem.id);
    }

    // 5. Update Order Status if all items refunded
    const { data: allItems } = await admin
      .from("order_items")
      .select("status")
      .eq("order_id", id);
      
    const isAllOOS = allItems?.every((i: any) => i.status === "OUT_OF_STOCK");
    
    if (isAllOOS) {
       await admin
        .from("orders")
        .update({ status: "REFUNDED" })
        .eq("id", id);
    }

    return NextResponse.json({ 
      success: true, 
      refunded_amount: totalRefundAmount,
      new_balance: newBalance
    });

  } catch (err) {
    console.error("Refund error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
