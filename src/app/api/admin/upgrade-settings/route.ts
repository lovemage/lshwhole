import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// 管理端：批發升級申請資格設定（文字規則 / 銀行帳號 / 代理費）
export async function GET(req: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from("settings_business_info")
      .select("bank_account_text, wholesale_upgrade_rules, wholesale_agent_fee_twd, line_link")
      .eq("id", true)
      .maybeSingle();

    if (error) {
      console.error("GET /api/admin/upgrade-settings error:", error);
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
        line_link: data.line_link,
      },
    });
  } catch (err) {
    console.error("GET /api/admin/upgrade-settings error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const body = await req.json().catch(() => ({} as Record<string, unknown>));

    const rules_text = typeof body.rules_text === "string" ? body.rules_text : null;
    const bank_account_info =
      typeof body.bank_account_info === "string" ? body.bank_account_info : null;
    const line_link = typeof body.line_link === "string" ? body.line_link : null;

    const rawFee = body.agent_fee_twd;
    let agent_fee_twd: number | null = null;
    if (rawFee !== undefined && rawFee !== null && rawFee !== "") {
      const n = Number(rawFee);
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json(
          { error: "agent_fee_twd 必須為 >= 0 的數字" },
          { status: 400 }
        );
      }
      agent_fee_twd = Math.floor(n);
    }

    const patch: Record<string, unknown> = {
      bank_account_text: bank_account_info,
      wholesale_upgrade_rules: rules_text,
      wholesale_agent_fee_twd: agent_fee_twd,
      line_link: line_link,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await admin
      .from("settings_business_info")
      .upsert({ id: true, ...patch })
      .select("bank_account_text, wholesale_upgrade_rules, wholesale_agent_fee_twd, line_link")
      .single();

    if (error) {
      console.error("PUT /api/admin/upgrade-settings error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      data: {
        rules_text: data.wholesale_upgrade_rules,
        bank_account_info: data.bank_account_text,
        agent_fee_twd: data.wholesale_agent_fee_twd,
        line_link: data.line_link,
      },
    });
  } catch (err) {
    console.error("PUT /api/admin/upgrade-settings error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
