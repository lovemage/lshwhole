import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/admin/members/expired
 * 查詢 45 日未消費會員（Retail 和 Wholesale）
 */
export async function GET(request: NextRequest) {
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
      .select("is_admin")
      .eq("user_id", user.id)
      .single();

    if (!adminProfile || !(adminProfile as any).is_admin) {
      return NextResponse.json({ error: "無權限執行此操作" }, { status: 403 });
    }

    // 計算 45 天前的日期
    const fortyFiveDaysAgo = new Date();
    fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

    // 查詢 Retail 和 Wholesale 會員
    const { data: members, error: membersError } = await admin
      .from("profiles")
      .select("user_id, email, display_name, tier, login_enabled, last_purchase_date, created_at")
      .in("tier", ["retail", "wholesale"])
      .eq("login_enabled", true);

    if (membersError) {
      console.error("查詢會員失敗:", membersError);
      return NextResponse.json({ error: "查詢會員失敗" }, { status: 500 });
    }

    // 篩選出超期未消費的會員
    const expiredMembers = [];
    const now = new Date();

    for (const member of members || []) {
      // 如果沒有消費記錄，檢查註冊日期
      if (!member.last_purchase_date) {
        const createdAt = new Date(member.created_at);
        const daysSinceCreated = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceCreated > 45) {
          expiredMembers.push({
            ...member,
            days_since_last_purchase: daysSinceCreated,
            reason: '註冊後從未消費',
          });
        }
      } else {
        // 有消費記錄，檢查最後消費日期
        const lastPurchase = new Date(member.last_purchase_date);
        const daysSinceLastPurchase = Math.floor((now.getTime() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastPurchase > 45) {
          expiredMembers.push({
            ...member,
            days_since_last_purchase: daysSinceLastPurchase,
            reason: '超過 45 日未消費',
          });
        }
      }
    }

    return NextResponse.json({
      total: expiredMembers.length,
      members: expiredMembers,
    });

  } catch (err) {
    console.error("GET /api/admin/members/expired error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/members/expired/close-login
 * 自動關閉超期未消費會員的登入權限
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

    // 驗證管理員權限
    const { data: adminProfile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .single();

    if (!adminProfile || !(adminProfile as any).is_admin) {
      return NextResponse.json({ error: "無權限執行此操作" }, { status: 403 });
    }

    // 計算 45 天前的日期
    const fortyFiveDaysAgo = new Date();
    fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);
    const fortyFiveDaysAgoISO = fortyFiveDaysAgo.toISOString();

    // 關閉超期未消費會員的登入權限
    // 條件：Retail 或 Wholesale + 登入權限開啟 + (無消費記錄或最後消費超過45天)
    const { data: closedMembers, error: updateError } = await admin
      .from("profiles")
      .update({
        login_enabled: false,
        login_disabled_at: new Date().toISOString(),
        login_disabled_reason: '系統自動關閉：45 日內未消費',
        updated_at: new Date().toISOString(),
      })
      .in("tier", ["retail", "wholesale"])
      .eq("login_enabled", true)
      .or(`last_purchase_date.is.null,last_purchase_date.lt.${fortyFiveDaysAgoISO}`)
      .select("user_id, email, display_name, tier");

    if (updateError) {
      console.error("關閉登入權限失敗:", updateError);
      return NextResponse.json({ error: "關閉登入權限失敗" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `成功關閉 ${closedMembers?.length || 0} 個會員的登入權限`,
      closed_count: closedMembers?.length || 0,
      members: closedMembers || [],
    });

  } catch (err) {
    console.error("POST /api/admin/members/expired/close-login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

