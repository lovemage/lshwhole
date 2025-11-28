import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!authHeader?.startsWith("Bearer ") || !supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const body = await request.json();
    const { amount_twd, bank_account_last_5 } = body;

    if (!amount_twd || amount_twd <= 0) {
      return NextResponse.json({ error: "儲值金額必須大於 0" }, { status: 400 });
    }

    if (!bank_account_last_5 || bank_account_last_5.length !== 5) {
      return NextResponse.json({ error: "請輸入正確的帳號後五碼" }, { status: 400 });
    }

    const admin = supabaseAdmin();

    const { error: insertError } = await admin
      .from("wallet_topup_requests")
      .insert({
        user_id: user.id,
        amount_twd,
        bank_account_last_5,
        status: "PENDING"
      });

    if (insertError) {
      console.error("Topup request insert error:", insertError);
      return NextResponse.json({ error: "提交申請失敗: " + insertError.message }, { status: 500 });
    }

    // Send notification to admin
    try {
      // Get user profile for name
      const { data: profile } = await admin
        .from("profiles")
        .select("display_name, email")
        .eq("user_id", user.id)
        .single();

      const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM;

      if (adminEmail) {
        console.log(`Sending topup notification to admin: ${adminEmail}`);
        await sendEmail(adminEmail, 'admin_topup_notification', {
          user_name: profile?.display_name || '會員',
          user_email: profile?.email || 'Unknown',
          amount: amount_twd,
          bank_account: bank_account_last_5,
          request_time: new Date().toLocaleString('zh-TW')
        });
      } else {
        console.warn("No ADMIN_EMAIL or EMAIL_FROM configured, skipping admin notification");
      }
    } catch (emailErr) {
      console.error("Failed to send admin notification:", emailErr);
      // Don't fail the request just because email failed
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("Topup request error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
