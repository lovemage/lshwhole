import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = Math.min(Math.max(parseInt(limitParam || "12", 10) || 12, 1), 48);

    const admin = supabaseAdmin();

    // 1) 優先取近 30 天熱銷
    let { data, error } = await admin
      .from("retail_bestsellers_30d")
      .select("id,title,retail_price_twd,cover_image_url")
      .limit(limit);

    // 2) 若空或錯誤 → 退回首頁精選
    if (error || !data || data.length === 0) {
      const res1 = await admin
        .from("retail_home_featured")
        .select("id,title,retail_price_twd,cover_image_url")
        .limit(limit);
      if (!res1.error && res1.data && res1.data.length > 0) {
        data = res1.data;
      } else {
        const res2 = await admin
          .from("retail_latest10")
          .select("id,title,retail_price_twd,cover_image_url")
          .limit(limit);
        if (!res2.error) data = res2.data || [];
      }
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("GET /api/retail/bestsellers error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

