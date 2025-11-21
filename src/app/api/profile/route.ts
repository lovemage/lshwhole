import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

// 會員端：讀取自己的個人資料
export async function GET(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const admin = supabaseAdmin();

    // 讀取會員資料
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("user_id, email, display_name, phone, delivery_address, tier, account_status, login_enabled, last_purchase_date, created_at")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "找不到會員資料" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (err) {
    console.error("GET /api/profile error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// 會員端：更新自己的個人資料
export async function PUT(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const body = await request.json();
    const { display_name, phone, delivery_address } = body;

    const admin = supabaseAdmin();

    // 準備更新資料
    const updateData: {
      display_name?: string;
      phone?: string;
      delivery_address?: string;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (display_name !== undefined) updateData.display_name = display_name;
    if (phone !== undefined) updateData.phone = phone;
    if (delivery_address !== undefined) updateData.delivery_address = delivery_address;

    // 更新會員資料
    const { data: profile, error: updateError } = await admin
      .from("profiles")
      .update(updateData)
      .eq("user_id", user.id)
      .select("user_id, email, display_name, phone, delivery_address, tier, account_status, login_enabled, last_purchase_date")
      .single();

    if (updateError || !profile) {
      return NextResponse.json(
        { error: "更新會員資料失敗" },
        { status: 500 }
      );
    }

    return NextResponse.json(profile);
  } catch (err) {
    console.error("PUT /api/profile error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

