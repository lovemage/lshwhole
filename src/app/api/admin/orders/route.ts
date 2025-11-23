import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// 管理端：訂單列表
export async function GET(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const { searchParams } = new URL(request.url);

    const limit = Number(searchParams.get("limit") || "20");
    const offset = Number(searchParams.get("offset") || "0");
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";

    let query = admin
      .from("orders")
      .select(`
        id, user_id, status, total_twd, created_at, updated_at, hold_id,
        order_items (
          id, product_id, qty, unit_price_twd,
          products (
            sku, title_zh, title_original, images
          )
        )
      `, {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }

    // 目前僅支援以訂單編號精確搜尋
    if (search) {
      const idNum = Number(search);
      if (!Number.isNaN(idNum)) {
        query = query.eq("id", idNum);
      }
    }

    const { data: orders, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const list = orders || [];
    const userIds = list.map((o: any) => o.user_id).filter(Boolean);

    let profileMap = new Map<string, { email: string | null; display_name: string | null }>();

    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("user_id, email, display_name")
        .in("user_id", userIds);

      profileMap = new Map(
        (profiles || []).map((p: any) => [p.user_id, { email: p.email, display_name: p.display_name }])
      );
    }

    const result = list.map((o: any) => {
      const profile = profileMap.get(o.user_id) || { email: null, display_name: null };
      return {
        ...o,
        user_email: profile.email,
        user_display_name: profile.display_name,
      };
    });

    return NextResponse.json({ data: result, count: count || 0 });
  } catch (err) {
    console.error("GET /api/admin/orders error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
