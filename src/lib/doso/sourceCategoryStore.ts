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

const slugPart = (value: string) =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();

const getDirectoryKey = (directoryUrl: string) => {
  const option = DOSO_TARGET_OPTIONS.find((x) => x.url === directoryUrl);
  if (option?.label) return slugPart(option.label) || "DOSO";
  try {
    const pathname = new URL(directoryUrl).pathname;
    const seg = pathname.split("/").filter(Boolean).pop() || "doso";
    return slugPart(seg) || "DOSO";
  } catch {
    return "DOSO";
  }
};

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

const getNodeLineage = (nodes: DosoSourceCategoryNode[], sourceCategoryId: string) => {
  const id = String(sourceCategoryId || "").trim();
  if (!id) return [] as DosoSourceCategoryNode[];

  const byId = new Map<string, DosoSourceCategoryNode>();
  for (const node of nodes) {
    const key = String(node?.source_category_id || "").trim();
    if (!key) continue;
    if (!byId.has(key)) byId.set(key, node);
  }

  const start = byId.get(id);
  if (!start) return [];

  const lineage: DosoSourceCategoryNode[] = [];
  const seen = new Set<string>();
  let current: DosoSourceCategoryNode | undefined = start;

  while (current) {
    const currentId = String(current.source_category_id || "").trim();
    if (!currentId || seen.has(currentId)) break;
    seen.add(currentId);
    lineage.unshift(current);

    const parentId = String(current.parent_id || "").trim();
    if (!parentId || parentId === "0") break;
    current = byId.get(parentId);
  }

  return lineage;
};

const ensureCategoryBySlug = async (input: {
  slug: string;
  name: string;
  level: number;
}) => {
  const admin = supabaseAdmin();
  const slug = input.slug.toUpperCase();
  const { data: existing, error: queryError } = await admin
    .from("categories")
    .select("id,name")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle<{ id: number; name: string }>();

  if (queryError) throw new Error(queryError.message);

  if (existing?.id) {
    if (existing.name !== input.name) {
      const { error: updateError } = await admin
        .from("categories")
        .update({ name: input.name, updated_at: new Date().toISOString(), active: true })
        .eq("id", existing.id);
      if (updateError) throw new Error(updateError.message);
    }
    return existing.id;
  }

  const { data, error } = await admin
    .from("categories")
    .insert({
      slug,
      name: input.name,
      level: input.level,
      sort: 9999,
      description: "",
      icon: null,
      retail_visible: true,
      active: true,
    })
    .select("id")
    .single<{ id: number }>();

  if (error) throw new Error(error.message);
  return data.id;
};

const ensureCategoryRelation = async (parentId: number, childId: number) => {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("category_relations")
    .select("parent_category_id")
    .eq("parent_category_id", parentId)
    .eq("child_category_id", childId)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (data) return;

  const { error: insertError } = await admin.from("category_relations").insert({
    parent_category_id: parentId,
    child_category_id: childId,
  });
  if (insertError) throw new Error(insertError.message);
};

export const resolveOrCreateCategoryByDosoSource = async (
  sourceCategoryId?: string | null,
  sourceCategoryName?: string | null,
  directoryUrl?: string | null
) => {
  const key = String(sourceCategoryId || "").trim();
  const sourceName = String(sourceCategoryName || "").trim();
  const url = String(directoryUrl || "").trim();
  if (!url || (!key && !sourceName)) return null;

  const mapping = await getDosoSourceCategoryMapping();
  const l1Id = Number(mapping.l1_japan_id);
  if (!Number.isInteger(l1Id) || l1Id <= 0) return null;

  const cache = await getDosoSourceCategoryCache();
  const nodes = Array.isArray(cache.directories[url]) ? cache.directories[url] : [];
  const lineage = key ? getNodeLineage(nodes, key) : [];

  const l2Source =
    lineage.length > 0
      ? lineage[0]
      : {
          source_category_id: key || `adhoc_${slugPart(sourceName).toLowerCase()}`,
          name: sourceName,
          parent_id: null,
          level: 1,
          directory_url: url,
        };

  const l3Source = lineage.length >= 2 ? lineage[lineage.length - 1] : null;

  if (!l2Source?.name) return null;

  const directoryKey = getDirectoryKey(url);
  const l2Id = await ensureCategoryBySlug({
    slug: `DOSO_${directoryKey}_L2_${slugPart(String(l2Source.source_category_id || l2Source.name))}`,
    name: l2Source.name,
    level: 2,
  });
  await ensureCategoryRelation(l1Id, l2Id);

  if (!l3Source || String(l3Source.source_category_id || "") === String(l2Source.source_category_id || "")) {
    return { l1_id: l1Id, l2_id: l2Id, l3_id: null };
  }

  const l3Id = await ensureCategoryBySlug({
    slug: `DOSO_${directoryKey}_L3_${slugPart(String(l3Source.source_category_id || l3Source.name))}`,
    name: l3Source.name,
    level: 3,
  });
  await ensureCategoryRelation(l2Id, l3Id);

  return { l1_id: l1Id, l2_id: l2Id, l3_id: l3Id };
};
