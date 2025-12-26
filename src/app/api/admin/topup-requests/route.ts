import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "PENDING";

    // 1. Fetch Requests (without join)
    const { data: requests, error } = await admin
      .from("wallet_topup_requests")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error in GET topup-requests:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!requests || requests.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // 2. Fetch Profiles separately
    const userIds = [...new Set(requests.map((r) => r.user_id))];
    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("user_id, email, display_name, phone")
      .in("user_id", userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      // Continue without profiles if error, or return empty?
      // Better to return what we have, profiles might be null
    }

    const profileMap = new Map<string, { email: string | null; display_name: string | null; phone: string | null }>();
    (profiles || []).forEach((p) => {
      profileMap.set(p.user_id, {
        email: p.email ?? null,
        display_name: p.display_name ?? null,
        phone: p.phone ?? null,
      });
    });

    // 3. Map together
    const mappedData = requests.map((item) => ({
      ...item,
      user: profileMap.get(item.user_id) || { email: "Unknown", display_name: "Unknown", phone: null }
    }));

    return NextResponse.json({ data: mappedData });
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

    // Fetch user profile for email
    const { data: profile } = await admin
      .from("profiles")
      .select("email, display_name")
      .eq("user_id", reqData.user_id)
      .single();

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
        .update({ status: "APPROVED", note: note, updated_at: new Date().toISOString() })
        .eq("id", id);

        // Send Email
        if (profile?.email) {
          await sendEmail(profile.email, 'topup_success', {
            name: profile.display_name || '會員',
            amount: amount,
            balance: newBalance
          });
        }

    } else if (action === "REJECT") {
        await admin
        .from("wallet_topup_requests")
        .update({ status: "REJECTED", note: note, updated_at: new Date().toISOString() })
        .eq("id", id);

        // Send Email
        if (profile?.email) {
          await sendEmail(profile.email, 'topup_failed', {
            name: profile.display_name || '會員',
            reason: note || '資料不符或其他原因'
          });
        }
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("PUT topup requests error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
