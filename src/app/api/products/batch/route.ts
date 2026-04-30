import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const body = await request.json();
    const { action, ids, status, category_ids, tag_id } = body || {};

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "缺少 ids" }, { status: 400 });
    }

    if (action === "status") {
      // schema 使用 status: 'draft'|'published'
      const newStatus = status === "published" ? "published" : "draft";
      const { error } = await admin
        .from("products")
        .update({ status: newStatus })
        .in("id", ids);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const { error } = await admin
        .from("products")
        .delete()
        .in("id", ids);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === "category") {
      const categoryIds = Array.isArray(category_ids)
        ? Array.from(
            new Set(
              category_ids
                .map((cid: any) => Number(cid))
                .filter((n: number) => Number.isInteger(n) && n > 0)
            )
          )
        : [];

      if (categoryIds.length === 0) {
        return NextResponse.json({ error: "缺少有效分類" }, { status: 400 });
      }

      const { error: delError } = await admin
        .from("product_category_map")
        .delete()
        .in("product_id", ids);

      if (delError) {
        return NextResponse.json({ error: delError.message }, { status: 400 });
      }

      const rows = ids.flatMap((productId: number) =>
        categoryIds.map((categoryId: number) => ({ product_id: productId, category_id: categoryId }))
      );

      if (rows.length > 0) {
        const { error: insError } = await admin.from("product_category_map").insert(rows);
        if (insError) {
          return NextResponse.json({ error: insError.message }, { status: 400 });
        }
      }

      return NextResponse.json({ success: true });
    }

    if (action === "remove_brand") {
      const { data: brandTags, error: brandTagErr } = await admin
        .from("tags")
        .select("id")
        .eq("category", "A1");

      if (brandTagErr) {
        return NextResponse.json({ error: brandTagErr.message }, { status: 400 });
      }

      const brandTagIds = (brandTags || []).map((t: { id: number }) => t.id);
      if (brandTagIds.length === 0) {
        return NextResponse.json({ success: true });
      }

      const { error: delError } = await admin
        .from("product_tag_map")
        .delete()
        .in("product_id", ids)
        .in("tag_id", brandTagIds);

      if (delError) {
        return NextResponse.json({ error: delError.message }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === "remove_tag") {
      const tagId = Number(tag_id);
      if (!Number.isInteger(tagId) || tagId <= 0) {
        return NextResponse.json({ error: "缺少有效 tag_id" }, { status: 400 });
      }

      const { error: delError } = await admin
        .from("product_tag_map")
        .delete()
        .in("product_id", ids)
        .eq("tag_id", tagId);

      if (delError) {
        return NextResponse.json({ error: delError.message }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "未知動作" }, { status: 400 });
  } catch (err) {
    console.error("POST /api/products/batch error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
