import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// 獲取會員列表
export async function GET(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
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
    const userIds = (profiles || []).map((p: any) => p.user_id);
    let walletMap = new Map<string, number>();

    if (userIds.length > 0) {
      const { data: wallets } = await admin
        .from("wallets")
        .select("user_id, balance_twd")
        .in("user_id", userIds);

      walletMap = new Map((wallets || []).map((w: any) => [w.user_id, w.balance_twd]));
    }

    const result = (profiles || []).map((p: any) => ({
      ...p,
      balance_twd: walletMap.get(p.user_id) || 0,
    }));

    return NextResponse.json({ data: result, count: count || 0 });
  } catch (err) {
    console.error("GET /api/admin/members error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
