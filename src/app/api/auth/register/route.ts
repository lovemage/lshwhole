import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, displayName, phone, deliveryAddress } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

    const admin = supabaseAdmin();

    // Create or update profile
    const { error } = await admin.from("profiles").upsert(
      [
        {
          user_id: userId,
          email: email || "",
          display_name: displayName || "",
          phone: phone || "",
          delivery_address: deliveryAddress || "",
          // 新註冊會員預設為 guest
          tier: "guest",
          account_status: "ACTIVE",
          login_enabled: true, // 預設開啟登入權限
          terms_accepted_at: new Date().toISOString(),
        },
      ],
      { onConflict: "user_id" }
    );

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Profile created successfully" },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

