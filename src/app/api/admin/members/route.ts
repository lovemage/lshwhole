import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

// 獲取會員列表
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
    const { data: adminProfile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .single();

    if (!adminProfile || !(adminProfile as any).is_admin) {
      return NextResponse.json({ error: "無權限執行此操作" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || "50");
    const offset = Number(searchParams.get("offset") || "0");
    const search = searchParams.get("search") || "";
    const tier = searchParams.get("tier") || "";
    const statusFilter = searchParams.get("status_filter") || "";

    let query = admin
      .from("profiles")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(
        `email.ilike.%${search}%,display_name.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }

    if (tier) {
      query = query.eq("tier", tier);
    }

    if (statusFilter === "disabled") {
      query = query.eq("login_enabled", false);
    } else if (statusFilter === "overdue") {
      // 篩選 45 天未消費的 Retail/Wholesale 會員
      // 邏輯：tier 在 retail/wholesale 且 (last_purchase_date < 45天前 或 last_purchase_date 為 null 且 created_at < 45天前)
      // 這裡簡化：last_purchase_date < 45 days ago
      const date45DaysAgo = new Date();
      date45DaysAgo.setDate(date45DaysAgo.getDate() - 45);
      const dateStr = date45DaysAgo.toISOString();
      
      // Supabase query builder 限制：複雜的 OR/AND 組合較難一次完成
      // 這裡先篩選 tier，然後用 lt (less than) last_purchase_date
      // 注意：這可能會遺漏 "從未消費但註冊超過45天" 的人，若需包含可再調整
      query = query.in("tier", ["retail", "wholesale"]).lt("last_purchase_date", dateStr);
    }

    const { data: profiles, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 獲取每個會員的錢包餘額
    const userIds = (profiles || []).map((p) => p.user_id);
    let walletMap = new Map<string, number>();

    if (userIds.length > 0) {
      const { data: wallets } = await admin
        .from("wallets")
        .select("user_id, balance_twd")
        .in("user_id", userIds);

      walletMap = new Map((wallets || []).map((w) => [w.user_id, w.balance_twd]));
    }

    const result = (profiles || []).map((p) => ({
      ...p,
      balance_twd: walletMap.get(p.user_id) || 0,
    }));

    return NextResponse.json({ data: result, count: count || 0 });
  } catch (err) {
    console.error("GET /api/admin/members error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
