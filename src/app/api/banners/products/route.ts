import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { v2 as cloudinary } from "cloudinary";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const activeOnly = url.searchParams.get("active") === "true";
  const limit = Number(url.searchParams.get("limit") || "0");

  const admin = supabaseAdmin();
  let q = admin
    .from("products_banners")
    .select("*")
    .order("sort", { ascending: true })
    .order("updated_at", { ascending: false });
  if (activeOnly) q = q.eq("active", true);
  if (limit > 0) q = q.limit(limit);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { image_url, sort = 0, active = true } = body || {};
  if (!image_url || typeof image_url !== "string") {
    return NextResponse.json({ error: "image_url 必填" }, { status: 400 });
  }
  const admin = supabaseAdmin();

  // 限制最多 5 張
  const { count, error: cntErr } = await admin
    .from("products_banners")
    .select("id", { count: "exact", head: true });
  if (cntErr) return NextResponse.json({ error: cntErr.message }, { status: 400 });
  if ((count || 0) >= 5)
    return NextResponse.json({ error: "最多可建立 5 張商品頁橫幅" }, { status: 400 });

  const { data, error } = await admin
    .from("products_banners")
    .insert({ image_url, sort, active })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function PUT(req: NextRequest) {
  const url = new URL(req.url);
  const idRaw = url.searchParams.get("id");
  if (!idRaw) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  const id = Number(idRaw);
  const body = await req.json().catch(() => ({}));
  const allowed = ["image_url", "sort", "active"] as const;
  const patch: Record<string, any> = {};
  for (const k of allowed) if (k in body) patch[k] = (body as any)[k];
  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("products_banners")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const idRaw = url.searchParams.get("id");
  if (!idRaw) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  const id = Number(idRaw);
  const admin = supabaseAdmin();

  // Get banner info first
  const { data: banner } = await admin.from("products_banners").select("image_url").eq("id", id).single();

  const { error } = await admin.from("products_banners").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Delete image from Cloudinary
  if (banner?.image_url) {
    const publicId = getPublicIdFromUrl(banner.image_url);
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (e) {
        console.error("Failed to delete image from Cloudinary:", e);
      }
    }
  }

  return NextResponse.json({ ok: true });
}

function getPublicIdFromUrl(url: string) {
  try {
    const regex = /\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/;
    const match = url.match(regex);
    if (match) return match[1];
  } catch {}
  return null;
}
