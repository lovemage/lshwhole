import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // order_id
    const body = await request.json();
    const { item_ids } = body; // Array of item IDs to pay for

    if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
      return NextResponse.json({ error: "請選擇要支付運費的商品" }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const authHeader = request.headers.get("Authorization");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!authHeader?.startsWith("Bearer ") || !supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "未登入或憑證無效" }, { status: 401 });
    }

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    // 1. Verify Order Ownership
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "訂單不存在" }, { status: 404 });
    }

    if (order.user_id !== user.id) {
      return NextResponse.json({ error: "這不是您的訂單" }, { status: 403 });
    }

    // 2. Fetch Items & Validity
    const { data: items, error: itemsError } = await admin
      .from("order_items")
      .select("id, shipping_fee_intl, shipping_fee_domestic, shipping_paid, order_id")
      .eq("order_id", id)
      .in("id", item_ids);

    if (itemsError || !items || items.length === 0) {
      return NextResponse.json({ error: "找不到有效的訂單商品" }, { status: 404 });
    }

    if (items.length !== item_ids.length) {
      return NextResponse.json({ error: "部分商品不存在" }, { status: 400 });
    }

    // 3. Calculate Total Amount
    let totalAmount = 0;
    const itemsToPay = [];

    for (const item of items) {
      if (item.shipping_paid) {
        // Skip already paid items or error? Let's error to prevent double payment confusion
        return NextResponse.json({ error: `商品 #${item.id} 已支付過運費` }, { status: 400 });
      }
      const fee = (item.shipping_fee_intl || 0) + (item.shipping_fee_domestic || 0);
      if (fee > 0) {
        totalAmount += fee;
        itemsToPay.push(item.id);
      }
    }

    if (totalAmount <= 0) {
      return NextResponse.json({ error: "選取的商品無需支付運費" }, { status: 400 });
    }

    // 4. Check Wallet Balance
    const { data: wallet, error: walletError } = await admin
      .from("wallets")
      .select("balance_twd")
      .eq("user_id", user.id)
      .single();

    if (walletError || !wallet) {
      return NextResponse.json({ error: "錢包不存在" }, { status: 400 });
    }

    if (wallet.balance_twd < totalAmount) {
      return NextResponse.json({ error: `餘額不足，共需 NT$${totalAmount}` }, { status: 400 });
    }

    // 5. Process Payment
    // 5.1 Ledger
    const externalRef = `ITEM_SHIP_PAY_${id}_${Date.now()}`;
    const { error: ledgerError } = await admin
      .from("wallet_ledger")
      .insert({
        user_id: user.id,
        type: "PURCHASE",
        amount_twd: -totalAmount,
        charge_type: "SHIPPING",
        external_ref: externalRef,
        note: `訂單 #${id} 商品補運費 (${itemsToPay.length} 件)`
      });

    if (ledgerError) {
      console.error("Ledger Error:", ledgerError);
      return NextResponse.json({ error: "建立交易紀錄失敗: " + ledgerError.message }, { status: 500 });
    }

    // 5.2 Update Wallet
    const newBalance = wallet.balance_twd - totalAmount;
    const { error: updateWalletError } = await admin
      .from("wallets")
      .update({
        balance_twd: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateWalletError) {
      console.error("Wallet Update Error:", updateWalletError);
      return NextResponse.json({ error: "更新錢包餘額失敗" }, { status: 500 });
    }

    // 5.3 Update Items Status
    const { error: updateItemsError } = await admin
      .from("order_items")
      .update({ shipping_paid: true })
      .in("id", itemsToPay);

    if (updateItemsError) {
      console.error("Order Items Update Error:", updateItemsError);
      return NextResponse.json({ error: "更新商品運費狀態失敗" }, { status: 500 });
    }

    return NextResponse.json({ success: true, new_balance: newBalance });

  } catch (err: any) {
    console.error("Pay item shipping error:", err);
    return NextResponse.json({ error: "Internal server error: " + (err.message || String(err)) }, { status: 500 });
  }
}
