import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const admin = supabaseAdmin();

    const { data, error } = await admin
      .from("product_category_map")
      .select(
        `
          product_id,
          category_id,
          products!inner ( status ),
          categories ( level )
        `
      )
      .eq("products.status", "published");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const byProduct = new Map<number, { l1Ids: Set<number>; categoryIds: Set<number> }>();

    (data || []).forEach((row: any) => {
      const productId = Number(row.product_id);
      const categoryId = Number(row.category_id);

      const categoryObj = Array.isArray(row.categories) ? row.categories[0] : row.categories;
      const level = Number(categoryObj?.level);

      if (Number.isNaN(productId) || Number.isNaN(categoryId)) return;

      let cur = byProduct.get(productId);
      if (!cur) {
        cur = { l1Ids: new Set<number>(), categoryIds: new Set<number>() };
        byProduct.set(productId, cur);
      }

      cur.categoryIds.add(categoryId);
      if (level === 1) {
        cur.l1Ids.add(categoryId);
      }
    });

    const visibleByL1 = new Map<number, Set<number>>();

    byProduct.forEach((p) => {
      if (p.l1Ids.size === 0) return;

      p.l1Ids.forEach((l1Id) => {
        const set = visibleByL1.get(l1Id) || new Set<number>();
        p.categoryIds.forEach((cid) => set.add(cid));
        set.add(l1Id);
        visibleByL1.set(l1Id, set);
      });
    });

    const payload: Record<string, number[]> = {};
    visibleByL1.forEach((set, l1Id) => {
      payload[String(l1Id)] = Array.from(set);
    });

    return NextResponse.json(payload);
  } catch (err) {
    console.error("GET /api/categories/visible-by-l1 error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
