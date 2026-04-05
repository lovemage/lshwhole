import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import {
  getDosoSourceCategoryCache,
  getDosoSourceCategoryMapping,
  saveDosoSourceCategoryMapping,
} from "@/lib/doso/sourceCategoryStore";
import type {
  DosoSourceCategoryMappingApiResponse,
  DosoSourceCategoryMappingConfig,
} from "@/lib/doso/types";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const collectCategoryIds = (mapping: DosoSourceCategoryMappingConfig) => {
  const ids = new Set<number>();
  if (mapping.l1_japan_id) ids.add(Number(mapping.l1_japan_id));

  for (const entry of Object.values(mapping.by_source_category_id || {})) {
    ids.add(Number(entry.l2_id));
    if (entry.l3_id) ids.add(Number(entry.l3_id));
  }
  for (const entry of Object.values(mapping.directory_fallback || {})) {
    ids.add(Number(entry.l2_id));
    if (entry.l3_id) ids.add(Number(entry.l3_id));
  }

  return Array.from(ids).filter((x) => Number.isInteger(x) && x > 0);
};

const validateCategoryIdsExist = async (ids: number[]) => {
  if (ids.length === 0) return true;
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("categories")
    .select("id")
    .in("id", ids)
    .returns<Array<{ id: number }>>();

  if (error) {
    throw new Error(error.message);
  }

  const found = new Set((data || []).map((x) => x.id));
  return ids.every((x) => found.has(x));
};

const validateMappingHierarchy = async (mapping: DosoSourceCategoryMappingConfig) => {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("category_relations")
    .select("parent_category_id,child_category_id")
    .returns<Array<{ parent_category_id: number; child_category_id: number }>>();

  if (error) {
    throw new Error(error.message);
  }

  const relationSet = new Set((data || []).map((r) => `${r.parent_category_id}->${r.child_category_id}`));
  const l1 = Number(mapping.l1_japan_id);

  const checkEntry = (entry: { l2_id: number; l3_id?: number | null }) => {
    if (!relationSet.has(`${l1}->${entry.l2_id}`)) return false;
    if (entry.l3_id && !relationSet.has(`${entry.l2_id}->${entry.l3_id}`)) return false;
    return true;
  };

  for (const entry of Object.values(mapping.by_source_category_id || {})) {
    if (!checkEntry(entry)) return false;
  }
  for (const entry of Object.values(mapping.directory_fallback || {})) {
    if (!checkEntry(entry)) return false;
  }
  return true;
};

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
      return NextResponse.json(
        { ok: false, error: auth.error } satisfies DosoSourceCategoryMappingApiResponse,
        { status: auth.status }
      );
    }

    const [categories, mapping] = await Promise.all([
      getDosoSourceCategoryCache(),
      getDosoSourceCategoryMapping(),
    ]);

    return NextResponse.json({
      ok: true,
      categories,
      mapping,
    } satisfies DosoSourceCategoryMappingApiResponse);
  } catch {
    return NextResponse.json(
      { ok: false, error: "get_source_category_mapping_failed" } satisfies DosoSourceCategoryMappingApiResponse,
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
      return NextResponse.json(
        { ok: false, error: auth.error } satisfies DosoSourceCategoryMappingApiResponse,
        { status: auth.status }
      );
    }

    const body = (await request.json().catch(() => null)) as DosoSourceCategoryMappingConfig | null;
    if (!body) {
      return NextResponse.json(
        { ok: false, error: "invalid_payload" } satisfies DosoSourceCategoryMappingApiResponse,
        { status: 400 }
      );
    }

    const ids = collectCategoryIds(body);
    const ok = await validateCategoryIdsExist(ids);
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "invalid_category_mapping" } satisfies DosoSourceCategoryMappingApiResponse,
        { status: 400 }
      );
    }

    const hierarchyOk = await validateMappingHierarchy(body);
    if (!hierarchyOk) {
      return NextResponse.json(
        { ok: false, error: "invalid_category_mapping_hierarchy" } satisfies DosoSourceCategoryMappingApiResponse,
        { status: 400 }
      );
    }

    const saved = await saveDosoSourceCategoryMapping(body);
    const categories = await getDosoSourceCategoryCache();

    return NextResponse.json({
      ok: true,
      categories,
      mapping: saved,
    } satisfies DosoSourceCategoryMappingApiResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "save_source_category_mapping_failed";
    return NextResponse.json(
      { ok: false, error: message } satisfies DosoSourceCategoryMappingApiResponse,
      { status: message === "invalid_l1_japan_id" ? 400 : 500 }
    );
  }
}
