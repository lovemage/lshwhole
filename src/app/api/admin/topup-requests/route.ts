import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "PENDING";

    const { data, error } = await admin
      .from("wallet_topup_requests")
      .select(`
        *,
        user:profiles!inner(email, display_name, phone)
      `)
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("GET topup requests error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const body = await request.json();
    const { id, action, note } = body; // action: 'APPROVE', 'REJECT'

    if (!id || !action) {
      return NextResponse.json({ error: "Missing id or action" }, { status: 400 });
    }

    // Fetch request
    const { data: reqData, error: reqError } = await admin
      .from("wallet_topup_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (reqError || !reqData) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (reqData.status !== "PENDING") {
      return NextResponse.json({ error: "Request already processed" }, { status: 400 });
    }

    if (action === "APPROVE") {
        // Process Topup Logic
        const userId = reqData.user_id;
        const amount = reqData.amount_twd;
        const externalRef = `TOPUP_REQ_${id}_${Date.now()}`;

        // 1. Insert Ledger
        const { error: ledgerError } = await admin
        .from("wallet_ledger")
        .insert({
            user_id: userId,
            type: "TOPUP",
            amount_twd: amount,
            charge_type: null,
            external_ref: externalRef,
            note: `儲值申請 #${id} 核准: ${note || ""}`
        });

        if (ledgerError) {
            return NextResponse.json({ error: "Ledger error: " + ledgerError.message }, { status: 500 });
        }

        // 2. Update Wallet
        const { data: wallet } = await admin.from("wallets").select("balance_twd").eq("user_id", userId).single();
        const currentBalance = wallet?.balance_twd || 0;
        const newBalance = currentBalance + amount;

        const { error: walletError } = await admin
        .from("wallets")
        .upsert({ user_id: userId, balance_twd: newBalance, updated_at: new Date().toISOString() });

        if (walletError) {
             return NextResponse.json({ error: "Wallet error: " + walletError.message }, { status: 500 });
        }

        // 3. Update Request Status
        await admin
        .from("wallet_topup_requests")
        .update({ status: "APPROVED", updated_at: new Date().toISOString() })
        .eq("id", id);

    } else if (action === "REJECT") {
        await admin
        .from("wallet_topup_requests")
        .update({ status: "REJECTED", updated_at: new Date().toISOString() })
        .eq("id", id);
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("PUT topup requests error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
