import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";

// 前台：零售會員提出升級為批發會員的申請
export async function POST(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const authHeader =
      request.headers.get("Authorization") || request.headers.get("authorization");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!authHeader?.startsWith("Bearer ") || !supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "未登入或憑證無效" }, { status: 401 });
    }

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "未登入或憑證無效" }, { status: 401 });
    }

    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("user_id, tier, wholesale_upgrade_status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 400 });
    }

    if (!profile) {
      return NextResponse.json({ error: "找不到會員資料" }, { status: 404 });
    }

    if (profile.tier !== "retail") {
      return NextResponse.json(
        { error: "只有零售會員可以申請升級為批發會員" },
        { status: 400 }
      );
    }

    if (profile.wholesale_upgrade_status === "PENDING") {
      return NextResponse.json(
        { error: "您已提出升級申請，請等待審核" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const { data, error } = await admin
      .from("profiles")
      .update({
        wholesale_upgrade_status: "PENDING",
        wholesale_upgrade_requested_at: now,
        updated_at: now,
      })
      .eq("user_id", user.id)
      .select("wholesale_upgrade_requested_at, wholesale_upgrade_status")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ requested_at: data.wholesale_upgrade_requested_at });
  } catch (err) {
    console.error("POST /api/member/upgrade-request error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

