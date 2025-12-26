import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

/**
 * PUT /api/admin/members/[id]/login-permission
 * 管理員開啟/關閉會員登入權限
 */
export async function PUT(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
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

    // 驗證管理員權限
    const { data: adminProfile } = await admin
      .from("profiles")
      .select("tier")
      .eq("user_id", user.id)
      .single();

    if (!adminProfile || adminProfile.tier !== 'vip') {
      return NextResponse.json({ error: "無權限執行此操作" }, { status: 403 });
    }

    const body = await request.json();
    const { login_enabled, reason } = body;

    if (typeof login_enabled !== 'boolean') {
      return NextResponse.json({ error: "login_enabled 必須為 boolean" }, { status: 400 });
    }

    const { id: memberId } = await paramsPromise;

    // 檢查目標會員是否存在
    const { data: targetMember, error: memberError } = await admin
      .from("profiles")
      .select("user_id, email, display_name, tier, login_enabled")
      .eq("user_id", memberId)
      .single();

    if (memberError || !targetMember) {
      return NextResponse.json({ error: "找不到該會員" }, { status: 404 });
    }

    // 準備更新資料
    const updateData: Record<string, unknown> = {
      login_enabled,
      updated_at: new Date().toISOString(),
    };

    if (!login_enabled) {
      // 關閉登入權限時記錄原因和時間
      updateData.login_disabled_at = new Date().toISOString();
      updateData.login_disabled_reason = reason || '管理員手動關閉';
    } else {
      // 開啟登入權限時清除關閉記錄
      updateData.login_disabled_at = null;
      updateData.login_disabled_reason = null;
    }

    // 更新會員登入權限
    const { data: updatedProfile, error: updateError } = await admin
      .from("profiles")
      .update(updateData)
      .eq("user_id", memberId)
      .select("user_id, email, display_name, tier, login_enabled, login_disabled_at, login_disabled_reason")
      .single();

    if (updateError) {
      console.error("更新登入權限失敗:", updateError);
      return NextResponse.json({ error: "更新登入權限失敗" }, { status: 500 });
    }

    // 記錄操作日誌（可選，如果有 admin_logs 表）
    // await admin.from("admin_logs").insert({
    //   admin_id: user.id,
    //   action: login_enabled ? 'ENABLE_LOGIN' : 'DISABLE_LOGIN',
    //   target_user_id: memberId,
    //   details: { reason },
    //   created_at: new Date().toISOString(),
    // });

    return NextResponse.json({
      success: true,
      message: login_enabled ? "已開啟會員登入權限" : "已關閉會員登入權限",
      profile: updatedProfile,
    });

  } catch (err) {
    console.error("PUT /api/admin/members/[id]/login-permission error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/admin/members/[id]/login-permission
 * 查詢會員登入權限狀態
 */
export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
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

    // 驗證管理員權限
    const { data: adminProfile } = await admin
      .from("profiles")
      .select("tier")
      .eq("user_id", user.id)
      .single();

    if (!adminProfile || adminProfile.tier !== 'vip') {
      return NextResponse.json({ error: "無權限執行此操作" }, { status: 403 });
    }

    const { id: memberId } = await paramsPromise;

    // 查詢會員登入權限狀態
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("user_id, email, display_name, tier, login_enabled, login_disabled_at, login_disabled_reason, last_purchase_date")
      .eq("user_id", memberId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "找不到該會員" }, { status: 404 });
    }

    return NextResponse.json(profile);

  } catch (err) {
    console.error("GET /api/admin/members/[id]/login-permission error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
