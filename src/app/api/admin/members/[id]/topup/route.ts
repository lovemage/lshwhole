import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// 管理員手動為會員儲值
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = supabaseAdmin();
    const { id: userId } = await params;
    const body = await request.json();

    const { amount_twd, note } = body;

    if (!amount_twd || amount_twd <= 0) {
      return NextResponse.json(
        { error: "儲值金額必須大於 0" },
        { status: 400 }
      );
    }

    // 確保金額為整數
    const amountInt = Math.floor(Number(amount_twd));

    // 生成唯一的 external_ref
    const externalRef = `ADMIN_TOPUP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 1. 確保 wallet 存在
    const { data: existingWallet } = await admin
      .from("wallets")
      .select("user_id")
      .eq("user_id", userId)
      .single();

    if (!existingWallet) {
      // 創建錢包
      const { error: walletCreateError } = await admin
        .from("wallets")
        .insert({ user_id: userId, balance_twd: 0 });

      if (walletCreateError) {
        return NextResponse.json(
          { error: walletCreateError.message },
          { status: 400 }
        );
      }
    }

    // 2. 寫入 wallet_ledger（TOPUP）
    const { error: ledgerError } = await admin
      .from("wallet_ledger")
      .insert({
        user_id: userId,
        type: "TOPUP",
        amount_twd: amountInt,
        charge_type: null,
        external_ref: externalRef,
      });

    if (ledgerError) {
      return NextResponse.json({ error: ledgerError.message }, { status: 400 });
    }

    // 3. 更新 wallet 餘額
    const { data: wallet, error: walletError } = await admin
      .from("wallets")
      .select("balance_twd")
      .eq("user_id", userId)
      .single();

    if (walletError) {
      return NextResponse.json({ error: walletError.message }, { status: 400 });
    }

    const newBalance = (wallet?.balance_twd || 0) + amountInt;

    const { error: updateError } = await admin
      .from("wallets")
      .update({ balance_twd: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // 4. 記錄到 audit_logs（可選）
    await admin.from("audit_logs").insert({
      actor_type: "admin",
      actor_id: "system", // 可以改為實際管理員 ID
      action: "TOPUP",
      entity: "wallet",
      entity_id: userId,
      diff: {
        amount_twd: amountInt,
        note: note || "",
        external_ref: externalRef,
        old_balance: wallet?.balance_twd || 0,
        new_balance: newBalance,
      },
    });

    return NextResponse.json({
      success: true,
      new_balance: newBalance,
      amount_added: amountInt,
      external_ref: externalRef,
    });
  } catch (err) {
    console.error("POST /api/admin/members/[id]/topup error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

