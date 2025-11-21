import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const pageType = url.searchParams.get("page_type") || "index";
  const admin = supabaseAdmin();
  const { data, error } = await admin.from("banner_settings").select("*").eq("page_type", pageType).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  // 若無資料，回傳預設 5 秒
  return NextResponse.json({ data: data || { page_type: pageType, carousel_interval: 5 } });
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const page_type = body?.page_type || "index";
  const carousel_interval = Number(body?.carousel_interval ?? 5);
  if (!page_type) return NextResponse.json({ error: "缺少 page_type" }, { status: 400 });
  if (!Number.isFinite(carousel_interval) || carousel_interval < 1) {
    return NextResponse.json({ error: "carousel_interval 必須為 >=1 的整數" }, { status: 400 });
  }
  const admin = supabaseAdmin();
  // upsert 設定
  const { data, error } = await admin
    .from("banner_settings")
    .upsert({ page_type, carousel_interval })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

