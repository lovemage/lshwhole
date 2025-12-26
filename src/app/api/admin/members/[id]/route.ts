import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// 獲取單一會員詳情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = supabaseAdmin();
    const { id } = await params;

    // 獲取會員資料
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("*")
      .eq("user_id", id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    // 獲取錢包餘額
    const { data: wallet } = await admin
      .from("wallets")
      .select("balance_twd")
      .eq("user_id", id)
      .single();

    // 獲取儲值記錄（只取 TOPUP 類型）
    const { data: topupHistory } = await admin
      .from("wallet_ledger")
      .select("*")
      .eq("user_id", id)
      .eq("type", "TOPUP")
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({
      profile,
      balance_twd: wallet?.balance_twd || 0,
      topup_history: topupHistory || [],
    });
  } catch (err) {
    console.error("GET /api/admin/members/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// 更新會員資料（包含會員資格與登入權限）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = supabaseAdmin();
    const { id } = await params;
    const body = await request.json();

    const { tier, account_status, display_name, phone, delivery_address, login_enabled, allowed_l1_category_ids } = body;

    const updateData: Record<string, unknown> = {};
    if (tier !== undefined) updateData.tier = tier;
    if (account_status !== undefined) updateData.account_status = account_status;
    if (display_name !== undefined) updateData.display_name = display_name;
    if (phone !== undefined) updateData.phone = phone;
    if (delivery_address !== undefined) updateData.delivery_address = delivery_address;
    if (allowed_l1_category_ids !== undefined) {
      updateData.allowed_l1_category_ids = allowed_l1_category_ids === null ? null : allowed_l1_category_ids;
    }
    
    // 處理登入權限變更
    if (login_enabled !== undefined) {
      updateData.login_enabled = login_enabled;
      if (login_enabled === false) {
        updateData.login_disabled_at = new Date().toISOString();
        updateData.login_disabled_reason = "管理員手動關閉";
      } else {
        updateData.login_disabled_at = null;
        updateData.login_disabled_reason = null;
      }
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await admin
      .from("profiles")
      .update(updateData)
      .eq("user_id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PUT /api/admin/members/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
