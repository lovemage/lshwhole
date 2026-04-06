import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

type BulkDeleteMode = "or" | "and";

const DELETE_BATCH_SIZE = 500;

function parseDays(value: unknown): number | null {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    return null;
  }
  return num;
}

function parseL1CategoryId(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    return null;
  }
  return num;
}

function buildCategoryTreeIds(
  rootId: number,
  relations: Array<{ parent_category_id: number; child_category_id: number }>
) {
  const childrenMap = new Map<number, number[]>();

  for (const relation of relations) {
    const list = childrenMap.get(relation.parent_category_id) || [];
    list.push(relation.child_category_id);
    childrenMap.set(relation.parent_category_id, list);
  }

  const result = new Set<number>([rootId]);
  const queue: number[] = [rootId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = childrenMap.get(current) || [];
    for (const childId of children) {
      if (!result.has(childId)) {
        result.add(childId);
        queue.push(childId);
      }
    }
  }

  return Array.from(result);
}

export async function POST(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const body = await request.json();

    const days = parseDays(body?.days);
    if (days === null) {
      return NextResponse.json({ error: "days 必須為正整數" }, { status: 400 });
    }

    const mode = body?.mode;
    if (mode !== "or" && mode !== "and") {
      return NextResponse.json({ error: "mode 必須為 or 或 and" }, { status: 400 });
    }

    const l1CategoryId = parseL1CategoryId(body?.l1CategoryId);
    if (
      body?.l1CategoryId !== null &&
      body?.l1CategoryId !== undefined &&
      body?.l1CategoryId !== "" &&
      l1CategoryId === null
    ) {
      return NextResponse.json({ error: "l1CategoryId 格式錯誤" }, { status: 400 });
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffIso = cutoff.toISOString();

    const { data: ageMatchedRows, error: ageError } = await admin
      .from("products")
      .select("id")
      .lte("created_at", cutoffIso);

    if (ageError) {
      return NextResponse.json({ error: ageError.message }, { status: 400 });
    }

    const ageMatchedIds = new Set<number>((ageMatchedRows || []).map((row: any) => row.id));
    let categoryMatchedIds = new Set<number>();

    if (l1CategoryId !== null) {
      const { data: l1Category, error: categoryError } = await admin
        .from("categories")
        .select("id, level")
        .eq("id", l1CategoryId)
        .single();

      if (categoryError || !l1Category) {
        return NextResponse.json({ error: "指定 L1 分類不存在" }, { status: 400 });
      }

      if ((l1Category as any).level !== 1) {
        return NextResponse.json({ error: "指定分類不是 L1" }, { status: 400 });
      }

      const { data: relations, error: relationsError } = await admin
        .from("category_relations")
        .select("parent_category_id, child_category_id");

      if (relationsError) {
        return NextResponse.json({ error: relationsError.message }, { status: 400 });
      }

      const subtreeCategoryIds = buildCategoryTreeIds(
        l1CategoryId,
        (relations || []) as Array<{ parent_category_id: number; child_category_id: number }>
      );

      const { data: categoryMatchedRows, error: mapError } = await admin
        .from("product_category_map")
        .select("product_id")
        .in("category_id", subtreeCategoryIds);

      if (mapError) {
        return NextResponse.json({ error: mapError.message }, { status: 400 });
      }

      categoryMatchedIds = new Set<number>((categoryMatchedRows || []).map((row: any) => row.product_id));
    }

    const matchedIds = new Set<number>();

    if (l1CategoryId === null) {
      for (const id of ageMatchedIds) matchedIds.add(id);
    } else if (mode === "or") {
      for (const id of ageMatchedIds) matchedIds.add(id);
      for (const id of categoryMatchedIds) matchedIds.add(id);
    } else {
      for (const id of ageMatchedIds) {
        if (categoryMatchedIds.has(id)) {
          matchedIds.add(id);
        }
      }
    }

    const matchedArray = Array.from(matchedIds);
    if (matchedArray.length === 0) {
      return NextResponse.json({ success: true, matchedCount: 0, deletedCount: 0 });
    }

    let deletedCount = 0;

    for (let i = 0; i < matchedArray.length; i += DELETE_BATCH_SIZE) {
      const batchIds = matchedArray.slice(i, i + DELETE_BATCH_SIZE);
      const { error: deleteError } = await admin.from("products").delete().in("id", batchIds);

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 400 });
      }

      deletedCount += batchIds.length;
    }

    console.info("admin bulk product hard delete", {
      days,
      mode: mode as BulkDeleteMode,
      l1CategoryId,
      matchedCount: matchedArray.length,
      deletedCount,
    });

    return NextResponse.json({
      success: true,
      matchedCount: matchedArray.length,
      deletedCount,
    });
  } catch (err) {
    console.error("POST /api/admin/products/bulk-delete error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
