import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";

export type AdminAuthResult =
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string };

export async function requireAdmin(request: NextRequest): Promise<AdminAuthResult> {
  try {
    const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!authHeader?.startsWith("Bearer ") || !supabaseUrl || !supabaseAnonKey) {
      return { ok: false, status: 401, error: "未登入或憑證無效" };
    }

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError || !user) {
      return { ok: false, status: 401, error: "未登入" };
    }

    const admin = supabaseAdmin();
    const { data: adminProfile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .single();

    if (!adminProfile || !(adminProfile as any).is_admin) {
      return { ok: false, status: 403, error: "無權限執行此操作" };
    }

    return { ok: true, userId: user.id };
  } catch {
    return { ok: false, status: 500, error: "驗證失敗" };
  }
}
