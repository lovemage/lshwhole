import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const TZ_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8

function monthKeyUtc8(dateIso: string): string {
  const t = new Date(dateIso).getTime() + TZ_OFFSET_MS;
  const d = new Date(t);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

function getLocalMonthStartUtcIso(year: number, month1to12: number): string {
  // local (UTC+8) YYYY-MM-01 00:00:00 -> UTC = local - 8h
  const utcMs = Date.UTC(year, month1to12 - 1, 1, 0, 0, 0) - TZ_OFFSET_MS;
  return new Date(utcMs).toISOString();
}

function getCurrentLocalYearMonth(): { year: number; month: number } {
  const t = Date.now() + TZ_OFFSET_MS;
  const d = new Date(t);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

function addMonths(year: number, month1to12: number, delta: number): { year: number; month: number } {
  const idx = (year * 12 + (month1to12 - 1)) + delta;
  const y = Math.floor(idx / 12);
  const m = (idx % 12) + 1;
  return { year: y, month: m };
}

function pctChange(current: number, prev: number): { value: number; label: string; type: "positive" | "negative" } {
  if (prev === 0) {
    if (current === 0) return { value: 0, label: "0% 較上月", type: "positive" };
    return { value: 100, label: "+100% 較上月", type: "positive" };
  }
  const p = ((current - prev) / prev) * 100;
  const rounded = Math.round(p * 10) / 10;
  const type = rounded >= 0 ? "positive" : "negative";
  const sign = rounded >= 0 ? "+" : "";
  return { value: rounded, label: `${sign}${rounded}% 較上月`, type };
}

export async function GET(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const { searchParams } = new URL(request.url);

    const months = Math.max(1, Math.min(24, Number(searchParams.get("months") || "12")));

    const nowYm = getCurrentLocalYearMonth();
    const startYm = addMonths(nowYm.year, nowYm.month, -(months - 1));

    const startUtcIso = getLocalMonthStartUtcIso(startYm.year, startYm.month);

    const [ordersRes, profilesRes] = await Promise.all([
      admin
        .from("orders")
        .select("id, total_twd, created_at")
        .gte("created_at", startUtcIso),
      admin
        .from("profiles")
        .select("user_id, created_at")
        .gte("created_at", startUtcIso),
    ]);

    if (ordersRes.error) {
      return NextResponse.json({ error: ordersRes.error.message }, { status: 400 });
    }

    if (profilesRes.error) {
      return NextResponse.json({ error: profilesRes.error.message }, { status: 400 });
    }

    const monthMap = new Map<
      string,
      {
        month: string;
        sales_total_twd: number;
        orders_count: number;
        new_members_count: number;
      }
    >();

    const ensureMonth = (month: string) => {
      if (!monthMap.has(month)) {
        monthMap.set(month, {
          month,
          sales_total_twd: 0,
          orders_count: 0,
          new_members_count: 0,
        });
      }
      return monthMap.get(month)!;
    };

    // Pre-fill months to keep chart stable
    for (let i = 0; i < months; i++) {
      const ym = addMonths(startYm.year, startYm.month, i);
      ensureMonth(`${ym.year}-${String(ym.month).padStart(2, "0")}`);
    }

    (ordersRes.data || []).forEach((o) => {
      const createdAt = (o as { created_at?: string | null }).created_at;
      if (!createdAt) return;
      const m = monthKeyUtc8(createdAt);
      const bucket = ensureMonth(m);
      bucket.orders_count += 1;
      bucket.sales_total_twd += Number((o as { total_twd?: number | null }).total_twd || 0);
    });

    (profilesRes.data || []).forEach((p) => {
      const createdAt = (p as { created_at?: string | null }).created_at;
      if (!createdAt) return;
      const m = monthKeyUtc8(createdAt);
      const bucket = ensureMonth(m);
      bucket.new_members_count += 1;
    });

    const series = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));

    const currentKey = `${nowYm.year}-${String(nowYm.month).padStart(2, "0")}`;
    const prevYm = addMonths(nowYm.year, nowYm.month, -1);
    const prevKey = `${prevYm.year}-${String(prevYm.month).padStart(2, "0")}`;

    const cur = monthMap.get(currentKey) || {
      month: currentKey,
      sales_total_twd: 0,
      orders_count: 0,
      new_members_count: 0,
    };
    const prev = monthMap.get(prevKey) || {
      month: prevKey,
      sales_total_twd: 0,
      orders_count: 0,
      new_members_count: 0,
    };

    const salesChange = pctChange(cur.sales_total_twd, prev.sales_total_twd);
    const ordersChange = pctChange(cur.orders_count, prev.orders_count);
    const membersChange = pctChange(cur.new_members_count, prev.new_members_count);

    return NextResponse.json({
      timezone: "UTC+8",
      current_month: currentKey,
      previous_month: prevKey,
      kpis: {
        sales_total_twd: {
          current: Math.floor(cur.sales_total_twd),
          previous: Math.floor(prev.sales_total_twd),
          changeLabel: salesChange.label,
          changeType: salesChange.type,
        },
        orders_count: {
          current: cur.orders_count,
          previous: prev.orders_count,
          changeLabel: ordersChange.label,
          changeType: ordersChange.type,
        },
        new_members_count: {
          current: cur.new_members_count,
          previous: prev.new_members_count,
          changeLabel: membersChange.label,
          changeType: membersChange.type,
        },
      },
      monthly: series,
    });
  } catch (err) {
    console.error("GET /api/admin/dashboard-stats error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
