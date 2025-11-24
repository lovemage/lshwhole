import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // order_id
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

    // 1. Check order
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "訂單不存在" }, { status: 404 });
    }

    if (order.status !== "ARRIVED_TW") {
      return NextResponse.json({ error: "訂單狀態不正確，無法支付運費" }, { status: 400 });
    }

    const shippingFee = (order.shipping_fee_intl || 0) + (order.box_fee || 0);
    if (shippingFee <= 0) {
      // No fee to pay, just update status?
      // Or maybe error? Let's allow update if fee is 0.
    }

    // 2. Check wallet
    const { data: wallet, error: walletError } = await admin
      .from("wallets")
      .select("balance_twd")
      .eq("user_id", user.id)
      .single();

    if (walletError || !wallet) {
      return NextResponse.json({ error: "錢包不存在" }, { status: 400 });
    }

    if (wallet.balance_twd < shippingFee) {
      return NextResponse.json({ error: `餘額不足，需要 NT$${shippingFee}` }, { status: 400 });
    }

    // 3. Process Payment
    // 3.1 Ledger
    const externalRef = `SHIP_PAY_${id}_${Date.now()}`;
    const { error: ledgerError } = await admin
      .from("wallet_ledger")
      .insert({
        user_id: user.id,
        type: "PAYMENT",
        amount_twd: -shippingFee,
        charge_type: "SHIPPING",
        external_ref: externalRef,
        note: `訂單 #${id} 補運費`
      });

    if (ledgerError) {
      return NextResponse.json({ error: "建立交易紀錄失敗: " + ledgerError.message }, { status: 500 });
    }

    // 3.2 Update Wallet
    const newBalance = wallet.balance_twd - shippingFee;
    const { error: updateWalletError } = await admin
      .from("wallets")
      .update({
        balance_twd: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateWalletError) {
      return NextResponse.json({ error: "更新錢包餘額失敗" }, { status: 500 });
    }

    // 4. Update Order Status
    const { error: updateOrderError } = await admin
      .from("orders")
      .update({
        status: "READY_TO_SHIP",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateOrderError) {
      return NextResponse.json({ error: "更新訂單狀態失敗" }, { status: 500 });
    }

    return NextResponse.json({ success: true, new_balance: newBalance });

  } catch (err) {
    console.error("Pay shipping error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
