# DOSO Source Category Mapping Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Auto-assign categories during DOSO publish using DOSO source category IDs, with directory-level fallback only when source category mapping is missing.

**Architecture:** Introduce source-category cache and source-category-to-local-category mapping in `system_settings`. Enrich imported items with DOSO source category metadata. During publish, resolve categories using source mapping first, then directory fallback. Add admin UI to refresh source categories and manage mapping coverage.

**Tech Stack:** Next.js App Router, TypeScript, Supabase `system_settings`, existing DOSO probe/import pipeline, React admin UI.

---

### Task 1: Extend DOSO types for source categories and mapping

**Files:**
- Modify: `src/lib/doso/types.ts`

**Step 1: Write failing compile usage**

```ts
const x: DosoSourceCategoryNode = null as any;
```

**Step 2: Run type check to verify fail**

Run: `npx tsc --noEmit`

**Step 3: Add minimal type definitions**

Add:
- `DosoSourceCategoryNode`
- `DosoSourceCategoryCache`
- `DosoSourceCategoryMappingConfig`
- publish-side source category fields on imported product shape

**Step 4: Verify**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```bash
git add src/lib/doso/types.ts
git commit -m "擴充DOSO來源分類映射型別"
```

### Task 2: Build source category cache + mapping store

**Files:**
- Create: `src/lib/doso/sourceCategoryStore.ts`

**Step 1: Write failing import check**

```ts
import { getDosoSourceCategoryMapping } from "@/lib/doso/sourceCategoryStore";
```

**Step 2: Run fail check**

Run: `npx tsc --noEmit`

**Step 3: Implement minimal store APIs**

- `getDosoSourceCategoryCache()`
- `saveDosoSourceCategoryCache()`
- `getDosoSourceCategoryMapping()`
- `saveDosoSourceCategoryMapping()`
- `resolveMappedCategoryBySourceCategoryId()`
- `resolveDirectoryFallbackCategory()`

Persist keys:
- `doso_source_categories_v1`
- `doso_source_category_mapping_v1`

**Step 4: Verify**

Run:
- `npx tsc --noEmit`
- `npm run lint -- src/lib/doso/sourceCategoryStore.ts`

**Step 5: Commit**

```bash
git add src/lib/doso/sourceCategoryStore.ts
git commit -m "新增DOSO來源分類映射儲存服務"
```

### Task 3: Add API to refresh source categories from DOSO

**Files:**
- Create: `src/app/api/admin/sync/doso/source-categories/refresh/route.ts`
- Modify: `src/lib/doso/probeService.ts`

**Step 1: Write failing endpoint check**

Run:

```bash
curl -i -X POST https://lshwholesale.com/api/admin/sync/doso/source-categories/refresh
```

**Step 2: Verify fail state**

Expect missing endpoint before implementation.

**Step 3: Implement minimal refresh flow**

- admin auth
- use DOSO login/session path
- fetch category trees for target directories
- normalize to `source_category_id/name/parent_id/level`
- save cache

**Step 4: Verify**

Run:
- `npx tsc --noEmit`
- `npm run lint -- src/app/api/admin/sync/doso/source-categories/refresh/route.ts src/lib/doso/probeService.ts`

**Step 5: Commit**

```bash
git add src/app/api/admin/sync/doso/source-categories/refresh/route.ts src/lib/doso/probeService.ts
git commit -m "新增DOSO來源分類樹同步API"
```

### Task 4: Add mapping read/write API

**Files:**
- Create: `src/app/api/admin/sync/doso/source-category-mapping/route.ts`

**Step 1: Write failing endpoint checks**

```bash
curl -i https://lshwholesale.com/api/admin/sync/doso/source-category-mapping
curl -i -X PUT https://lshwholesale.com/api/admin/sync/doso/source-category-mapping -H 'Content-Type: application/json' -d '{}'
```

**Step 2: Verify fail state**

Expect missing endpoint before implementation.

**Step 3: Implement minimal GET/PUT**

- GET: return source cache + mapping config
- PUT: validate and save `by_source_category_id` + `directory_fallback`

**Step 4: Verify**

Run:
- `npx tsc --noEmit`
- `npm run lint -- src/app/api/admin/sync/doso/source-category-mapping/route.ts`

**Step 5: Commit**

```bash
git add src/app/api/admin/sync/doso/source-category-mapping/route.ts
git commit -m "新增DOSO來源分類映射API"
```

### Task 5: Enrich imported products with source category metadata

**Files:**
- Modify: `src/lib/doso/probeService.ts`
- Modify: `src/lib/doso/importSessionService.ts` (if payload typing/storage needs update)

**Step 1: Write failing behavior check**

Confirm imported payload currently lacks stable `source_category_id` for many directories.

**Step 2: Verify fail state**

Probe one directory and inspect payload keys.

**Step 3: Implement minimal enrichment**

When mapping rows to import products:
- capture `row.category_id` / equivalent source category key
- attach `source_category_id`
- optionally attach `source_category_name`

**Step 4: Verify**

Run:
- `npx tsc --noEmit`
- `npm run lint -- src/lib/doso/probeService.ts src/lib/doso/importSessionService.ts`

**Step 5: Commit**

```bash
git add src/lib/doso/probeService.ts src/lib/doso/importSessionService.ts
git commit -m "導入商品補齊來源分類欄位"
```

### Task 6: Apply source mapping in publish flows

**Files:**
- Modify: `src/components/admin/CrawlerImport.tsx`
- Modify: `src/app/api/publish-product/route.ts` (if needed for strict validation)

**Step 1: Write failing behavior check**

Current publish relies on manual category or directory default.

**Step 2: Verify fail state**

Try publish without manual category for mixed-source products.

**Step 3: Implement mapping resolution order**

For each product:
1) source category mapping
2) directory fallback mapping
3) fail with `missing_category_mapping`

Apply to both single publish modal and batch publish.

**Step 4: Verify**

Run:
- `npx tsc --noEmit`
- `npm run lint -- src/components/admin/CrawlerImport.tsx src/app/api/publish-product/route.ts`

**Step 5: Commit**

```bash
git add src/components/admin/CrawlerImport.tsx src/app/api/publish-product/route.ts
git commit -m "上架流程改為來源分類映射優先"
```

### Task 7: Add admin UI for source category mapping

**Files:**
- Modify: `src/components/admin/CrawlerImport.tsx`

**Step 1: Write failing UI checklist**

No source category tree, no mapping coverage, no refresh action.

**Step 2: Verify fail state**

Open current admin page and confirm missing mapping UI.

**Step 3: Implement minimal UI**

- button: `同步來源分類`
- tree/list view per directory
- mapping selectors for each source category
- fallback mapping selectors per directory
- coverage summary (`已映射 / 總來源分類`)

**Step 4: Verify**

Run:
- `npx tsc --noEmit`
- `npm run lint -- src/components/admin/CrawlerImport.tsx`

**Step 5: Commit**

```bash
git add src/components/admin/CrawlerImport.tsx
git commit -m "後台新增來源分類映射管理介面"
```

### Task 8: Documentation and final verification

**Files:**
- Modify: `doc/問題描述.md`
- Modify: `docs/plans/2026-04-05-doso-source-category-mapping-design.md` (if implementation deltas)

**Step 1: Write docs checklist**

Need docs for:
- refresh source categories
- mapping priority
- fallback behavior

**Step 2: Verify gaps**

Read docs and list missing details.

**Step 3: Update docs minimally**

Add setup + troubleshooting steps.

**Step 4: Final verification**

Run:
- `npx tsc --noEmit`
- `npm run lint`

**Step 5: Commit**

```bash
git add doc/問題描述.md docs/plans/2026-04-05-doso-source-category-mapping-design.md
git commit -m "補充DOSO來源分類映射文件"
```

## Final Validation Checklist

- Source category trees can be refreshed and persisted.
- Mapping can be configured by source category ID.
- Publish uses source mapping first, directory fallback second.
- Mixed-category imports publish into correct local categories.
- Missing mappings produce explicit failure reasons.
- `npx tsc --noEmit` and lint checks pass.
