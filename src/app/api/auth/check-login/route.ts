import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/auth/check-login
 * 檢查會員登入權限狀態
 * 在登入後立即調用此 API 檢查是否有登入權限
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

    const admin = supabaseAdmin();

    // 查詢會員資料
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("user_id, email, display_name, tier, login_enabled, login_disabled_at, login_disabled_reason, account_status")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "找不到會員資料" }, { status: 404 });
    }

    // 檢查帳號狀態
    if (profile.account_status === 'LOCKED') {
      return NextResponse.json({
        allowed: false,
        reason: 'ACCOUNT_LOCKED',
        message: '帳號已被鎖定，請聯繫管理員',
      }, { status: 403 });
    }

    // 檢查登入權限
    if (!profile.login_enabled) {
      return NextResponse.json({
        allowed: false,
        reason: 'LOGIN_DISABLED',
        message: '系統無偵測到每月訂單，請聯繫管理員',
        disabled_at: profile.login_disabled_at,
        disabled_reason: profile.login_disabled_reason,
      }, { status: 403 });
    }

    // 登入權限正常
    return NextResponse.json({
      allowed: true,
      user_id: profile.user_id,
      email: profile.email,
      display_name: profile.display_name,
      tier: profile.tier,
    });

  } catch (err) {
    console.error("POST /api/auth/check-login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

