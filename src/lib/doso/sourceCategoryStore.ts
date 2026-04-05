import { supabaseAdmin } from "@/lib/supabase";
import { DOSO_TARGET_OPTIONS } from "@/lib/doso/targets";
import type {
  DosoCategoryMappingEntry,
  DosoSourceCategoryCache,
  DosoSourceCategoryMappingConfig,
  DosoSourceCategoryNode,
} from "@/lib/doso/types";

const CATEGORY_CACHE_KEY = "doso_source_categories_v1";
const CATEGORY_MAPPING_KEY = "doso_source_category_mapping_v1";

const VALID_DIRECTORY_URLS = new Set(DOSO_TARGET_OPTIONS.map((x) => x.url));

const emptyCache = (): DosoSourceCategoryCache => ({
  updated_at: new Date(0).toISOString(),
  directories: {},
});

const emptyMapping = (): DosoSourceCategoryMappingConfig => ({
  l1_japan_id: null,
  by_source_category_id: {},
  directory_fallback: {},
  updated_at: new Date(0).toISOString(),
});

export const getDosoSourceCategoryCache = async (): Promise<DosoSourceCategoryCache> => {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("system_settings")
    .select("value")
    .eq("key", CATEGORY_CACHE_KEY)
    .maybeSingle<{ value: DosoSourceCategoryCache }>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.value || typeof data.value !== "object") {
    return emptyCache();
  }

  return data.value;
};

export const saveDosoSourceCategoryCache = async (directories: Record<string, DosoSourceCategoryNode[]>) => {
  const normalized: Record<string, DosoSourceCategoryNode[]> = {};
  for (const [url, nodes] of Object.entries(directories || {})) {
    if (!VALID_DIRECTORY_URLS.has(url)) continue;
    normalized[url] = Array.isArray(nodes)
      ? nodes.filter((n) => n && n.source_category_id && n.name)
      : [];
  }

  const value: DosoSourceCategoryCache = {
    updated_at: new Date().toISOString(),
    directories: normalized,
  };

  const admin = supabaseAdmin();
  const { error } = await admin.from("system_settings").upsert(
    {
      key: CATEGORY_CACHE_KEY,
      value,
      updated_at: value.updated_at,
    },
    { onConflict: "key" }
  );

  if (error) {
    throw new Error(error.message);
  }

  return value;
};

export const getDosoSourceCategoryMapping = async (): Promise<DosoSourceCategoryMappingConfig> => {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("system_settings")
    .select("value")
    .eq("key", CATEGORY_MAPPING_KEY)
    .maybeSingle<{ value: DosoSourceCategoryMappingConfig }>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.value || typeof data.value !== "object") {
    return emptyMapping();
  }

  return {
    ...emptyMapping(),
    ...data.value,
    by_source_category_id: data.value.by_source_category_id || {},
    directory_fallback: data.value.directory_fallback || {},
  };
};

const normalizeEntry = (entry: any): DosoCategoryMappingEntry | null => {
  if (!entry || typeof entry !== "object") return null;
  const l2 = Number(entry.l2_id);
  if (!Number.isInteger(l2) || l2 <= 0) return null;

  const rawL3 = entry.l3_id;
  const l3Value = rawL3 === null || rawL3 === undefined || rawL3 === "" ? null : Number(rawL3);
  const normalizedL3 = l3Value !== null && Number.isInteger(l3Value) && l3Value > 0 ? l3Value : null;
  return {
    l2_id: l2,
    l3_id: normalizedL3,
  };
};

export const saveDosoSourceCategoryMapping = async (input: DosoSourceCategoryMappingConfig) => {
  const l1 = Number(input.l1_japan_id);
  if (!Number.isInteger(l1) || l1 <= 0) {
    throw new Error("invalid_l1_japan_id");
  }

  const bySource: Record<string, DosoCategoryMappingEntry> = {};
  for (const [sourceCategoryId, entry] of Object.entries(input.by_source_category_id || {})) {
    const key = String(sourceCategoryId || "").trim();
    if (!key) continue;
    const normalized = normalizeEntry(entry);
    if (!normalized) continue;
    bySource[key] = normalized;
  }

  const fallback: Record<string, DosoCategoryMappingEntry> = {};
  for (const [url, entry] of Object.entries(input.directory_fallback || {})) {
    if (!VALID_DIRECTORY_URLS.has(url)) continue;
    const normalized = normalizeEntry(entry);
    if (!normalized) continue;
    fallback[url] = normalized;
  }

  const value: DosoSourceCategoryMappingConfig = {
    l1_japan_id: l1,
    by_source_category_id: bySource,
    directory_fallback: fallback,
    updated_at: new Date().toISOString(),
  };

  const admin = supabaseAdmin();
  const { error } = await admin.from("system_settings").upsert(
    {
      key: CATEGORY_MAPPING_KEY,
      value,
      updated_at: value.updated_at,
    },
    { onConflict: "key" }
  );

  if (error) {
    throw new Error(error.message);
  }

  return value;
};

export const resolveMappedCategoryBySourceCategoryId = async (
  sourceCategoryId?: string | null,
  directoryUrl?: string | null
) => {
  const key = String(sourceCategoryId || "").trim();
  if (!key) return null;
  const mapping = await getDosoSourceCategoryMapping();
  const compositeKey = directoryUrl ? `${directoryUrl}::${key}` : "";
  const hit = (compositeKey ? mapping.by_source_category_id[compositeKey] : null) || mapping.by_source_category_id[key];
  if (!hit) return null;

  return {
    l1_id: mapping.l1_japan_id,
    l2_id: hit.l2_id,
    l3_id: hit.l3_id ?? null,
  };
};

export const resolveDirectoryFallbackCategory = async (directoryUrl?: string | null) => {
  const key = String(directoryUrl || "").trim();
  if (!key) return null;
  const mapping = await getDosoSourceCategoryMapping();
  const hit = mapping.directory_fallback[key];
  if (!hit) return null;

  return {
    l1_id: mapping.l1_japan_id,
    l2_id: hit.l2_id,
    l3_id: hit.l3_id ?? null,
  };
};
