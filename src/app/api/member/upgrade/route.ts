import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/member/upgrade
 * 會員升級 API
 * 
 * Guest → Retail: 需儲值 >= 1,500 元
 * Retail → Wholesale: 需儲值 >= 5,000 元 + 代理費 6,000 元
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");
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

    const body = await request.json();
    const { target_tier } = body; // 'retail' or 'wholesale'

    if (!target_tier || !['retail', 'wholesale'].includes(target_tier)) {
      return NextResponse.json({ error: "無效的升級目標" }, { status: 400 });
    }

    const admin = supabaseAdmin();

    // 1. 取得會員資料
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("user_id, tier, login_enabled")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "找不到會員資料" }, { status: 404 });
    }

    // 2. 檢查登入權限
    if (!profile.login_enabled) {
      return NextResponse.json({ error: "系統無偵測到每月訂單，請聯繫管理員" }, { status: 403 });
    }

    // 3. 取得錢包餘額
    const { data: wallet, error: walletError } = await admin
      .from("wallets")
      .select("balance_twd")
      .eq("user_id", user.id)
      .single();

    if (walletError || !wallet) {
      return NextResponse.json({ error: "找不到錢包資料" }, { status: 404 });
    }

    const currentBalance = wallet.balance_twd || 0;

    // 4. 根據目標等級驗證升級條件
    if (target_tier === 'retail') {
      // Guest → Retail: 需儲值 >= 1,500 元
      if (profile.tier !== 'guest') {
        return NextResponse.json({ error: "只有 Guest 會員可以升級為 Retail" }, { status: 400 });
      }

      if (currentBalance < 1500) {
        return NextResponse.json({ 
          error: "儲值金額不足，需要至少 1,500 元",
          required: 1500,
          current: currentBalance
        }, { status: 400 });
      }

      // 執行升級
      const { error: upgradeError } = await admin
        .from("profiles")
        .update({
          tier: 'retail',
          tier_upgraded_at: new Date().toISOString(),
          tier_upgraded_from: profile.tier,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (upgradeError) {
        console.error("升級失敗:", upgradeError);
        return NextResponse.json({ error: "升級失敗" }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: "成功升級為 Retail 會員",
        new_tier: 'retail'
      });

    } else if (target_tier === 'wholesale') {
      // Retail → Wholesale: 需儲值 >= 5,000 元 + 代理費 6,000 元
      if (profile.tier !== 'retail') {
        return NextResponse.json({ error: "只有 Retail 會員可以升級為 Wholesale" }, { status: 400 });
      }

      const REQUIRED_BALANCE = 5000;
      const AGENCY_FEE = 6000;

      if (currentBalance < REQUIRED_BALANCE + AGENCY_FEE) {
        return NextResponse.json({ 
          error: "儲值金額不足，需要至少 11,000 元（儲值 5,000 + 代理費 6,000）",
          required: REQUIRED_BALANCE + AGENCY_FEE,
          current: currentBalance
        }, { status: 400 });
      }

      // 開始交易：扣除代理費 + 升級會員
      const { error: deductError } = await admin
        .from("wallets")
        .update({
          balance_twd: currentBalance - AGENCY_FEE,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (deductError) {
        console.error("扣除代理費失敗:", deductError);
        return NextResponse.json({ error: "扣除代理費失敗" }, { status: 500 });
      }

      // 記錄錢包交易
      await admin.from("wallet_ledger").insert({
        user_id: user.id,
        type: 'DEBIT',
        amount_twd: AGENCY_FEE,
        description: 'Wholesale 會員升級代理費',
        created_at: new Date().toISOString(),
      });

      // 執行升級
      const { error: upgradeError } = await admin
        .from("profiles")
        .update({
          tier: 'wholesale',
          tier_upgraded_at: new Date().toISOString(),
          tier_upgraded_from: profile.tier,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (upgradeError) {
        console.error("升級失敗:", upgradeError);
        return NextResponse.json({ error: "升級失敗" }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: "成功升級為 Wholesale 會員",
        new_tier: 'wholesale',
        agency_fee_paid: AGENCY_FEE,
        remaining_balance: currentBalance - AGENCY_FEE
      });
    }

  } catch (err) {
    console.error("POST /api/member/upgrade error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

