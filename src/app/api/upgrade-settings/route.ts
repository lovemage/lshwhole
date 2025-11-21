import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// 前台使用：提供零售會員在 /member 升級區塊顯示的設定
export async function GET(req: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from("settings_business_info")
      .select("bank_account_text, wholesale_upgrade_rules, wholesale_agent_fee_twd")
      .eq("id", true)
      .maybeSingle();

    if (error) {
      console.error("GET /api/upgrade-settings error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({
      data: {
        rules_text: data.wholesale_upgrade_rules,
        bank_account_info: data.bank_account_text,
        agent_fee_twd: data.wholesale_agent_fee_twd,
      },
    });
  } catch (err) {
    console.error("GET /api/upgrade-settings error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

