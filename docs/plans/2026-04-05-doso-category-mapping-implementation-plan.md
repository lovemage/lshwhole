# DOSO Category Mapping (Auto L1/L2/L3) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable DOSO-imported products to auto-assign categories during publish using a fixed directory-to-category mapping, with L1 fixed to Japan.

**Architecture:** Store mapping config in `system_settings` (`doso_category_mapping_v1`), expose admin GET/PUT API for mapping management, and apply mapping at publish time using product source URL. Batch publish and single publish both enforce mapping availability and return explicit errors when missing.

**Tech Stack:** Next.js App Router APIs, TypeScript, Supabase (`system_settings`, categories), React admin UI (`CrawlerImport.tsx`), existing publish endpoints.

---

### Task 1: Add DOSO category mapping types

**Files:**
- Modify: `src/lib/doso/types.ts`

**Step 1: Write failing compile usage**

```ts
const x: DosoCategoryMappingConfig = null as any;
```

Expected: type not found before implementation.

**Step 2: Run type check to verify fail**

Run: `npx tsc --noEmit`
Expected: missing symbol error.

**Step 3: Write minimal implementation**

Add:
- `DosoCategoryMappingEntry`
- `DosoCategoryMappingConfig`
- `DosoCategoryMappingApiResponse`

Keep fields:
- `l1_japan_id`
- `mappings[url] = { l2_id, l3_id? }`

**Step 4: Run verification**

Run: `npx tsc --noEmit`
Expected: pass.

**Step 5: Commit**

```bash
git add src/lib/doso/types.ts
git commit -m "新增DOSO分類映射型別"
```

### Task 2: Build mapping storage service

**Files:**
- Create: `src/lib/doso/categoryMappingStore.ts`

**Step 1: Write failing import check**

```ts
import { getDosoCategoryMapping } from "@/lib/doso/categoryMappingStore";
```

Expected: module missing.

**Step 2: Run type check to verify fail**

Run: `npx tsc --noEmit`
Expected: module not found.

**Step 3: Write minimal implementation**

Implement:
- `getDosoCategoryMapping()`
- `saveDosoCategoryMapping(config)`
- `resolveDosoMappingForUrl(url)`

Persist key: `doso_category_mapping_v1` in `system_settings`.

Validation:
- URL must be one of DOSO target options
- `l1_japan_id` required
- `l2_id` required per mapped row

**Step 4: Run verification**

Run:
- `npx tsc --noEmit`
- `npm run lint -- src/lib/doso/categoryMappingStore.ts`

Expected: pass.

**Step 5: Commit**

```bash
git add src/lib/doso/categoryMappingStore.ts
git commit -m "新增DOSO分類映射儲存服務"
```

### Task 3: Add admin mapping API (GET/PUT)

**Files:**
- Create: `src/app/api/admin/sync/doso/category-mapping/route.ts`

**Step 1: Write failing endpoint checks**

Run:

```bash
curl -i https://lshwholesale.com/api/admin/sync/doso/category-mapping
curl -i -X PUT https://lshwholesale.com/api/admin/sync/doso/category-mapping -H 'Content-Type: application/json' -d '{}'
```

Expected: endpoint missing before implementation.

**Step 2: Verify fail state**

Confirm 404/invalid behavior.

**Step 3: Write minimal implementation**

`GET`:
- admin auth
- return mapping config with defaults

`PUT`:
- admin auth
- validate payload
- save config
- return normalized config

**Step 4: Run verification**

Run:
- `npx tsc --noEmit`
- `npm run lint -- src/app/api/admin/sync/doso/category-mapping/route.ts`

Expected: pass.

**Step 5: Commit**

```bash
git add src/app/api/admin/sync/doso/category-mapping/route.ts
git commit -m "新增DOSO分類映射管理API"
```

### Task 4: Add mapping UI in CrawlerImport

**Files:**
- Modify: `src/components/admin/CrawlerImport.tsx`

**Step 1: Write failing UI checklist**

Expected missing now:
- cannot configure per-directory L2/L3 mapping
- no mapping completeness indicator

**Step 2: Verify fail state**

Run `npm run dev`, inspect current crawler admin page.

**Step 3: Write minimal implementation**

Add section:
- fetch mapping via GET
- render all DOSO target URLs with L2/L3 selectors
- save via PUT
- show `已設定 X/9` status

Use existing categories data already fetched in component.

**Step 4: Run verification**

Run:
- `npx tsc --noEmit`
- `npm run lint -- src/components/admin/CrawlerImport.tsx`

Expected: pass.

**Step 5: Commit**

```bash
git add src/components/admin/CrawlerImport.tsx
git commit -m "後台新增DOSO目錄分類映射設定"
```

### Task 5: Apply mapping in batch publish

**Files:**
- Modify: `src/components/admin/CrawlerImport.tsx`
- Modify: `src/app/api/publish-product/route.ts` (only if payload validation requires explicit category behavior)

**Step 1: Write failing behavior check**

Given imported DOSO products with no manual L1/L2/L3 selection:
- current batch publish either fails or requires manual picks.

Expected: fail before mapping application.

**Step 2: Verify fail state**

Manual reproduce in admin UI.

**Step 3: Write minimal implementation**

In batch publish loop:
- infer source directory from `p.url` or stored origin context
- resolve mapping entry
- apply `category_ids = [l1_japan_id, l2_id, l3_id?].filter(Boolean)`
- if mapping missing, mark that product failed with `missing_category_mapping`

Do not block other products.

**Step 4: Run verification**

Run:
- `npx tsc --noEmit`
- `npm run lint -- src/components/admin/CrawlerImport.tsx src/app/api/publish-product/route.ts`

Expected: pass.

**Step 5: Commit**

```bash
git add src/components/admin/CrawlerImport.tsx src/app/api/publish-product/route.ts
git commit -m "批量上架支援DOSO自動分類映射"
```

### Task 6: Apply mapping in single publish modal

**Files:**
- Modify: `src/components/admin/CrawlerImport.tsx`

**Step 1: Write failing behavior check**

Single publish still expects manual category selection.

Expected: no auto fill.

**Step 2: Verify fail state**

Manual open publish modal for DOSO item.

**Step 3: Write minimal implementation**

When `openPublish(p)`:
- resolve mapping from product source URL
- auto-fill L1/L2/L3 in form
- if no mapping, show warning and disable confirm publish button

**Step 4: Run verification**

Run:
- `npx tsc --noEmit`
- `npm run lint -- src/components/admin/CrawlerImport.tsx`

Expected: pass.

**Step 5: Commit**

```bash
git add src/components/admin/CrawlerImport.tsx
git commit -m "單筆上架支援DOSO自動分類"
```

### Task 7: Docs and final verification

**Files:**
- Modify: `doc/問題描述.md`
- Modify: `docs/plans/2026-04-05-doso-category-mapping-design.md` (if implementation differences)

**Step 1: Write failing docs checklist**

Missing items to confirm:
- new mapping API
- admin config workflow
- publish failure code for missing mapping

**Step 2: Verify gaps**

Read docs and list missing statements.

**Step 3: Write minimal updates**

Add concise section for:
- mapping setup steps
- required fields
- fallback/failure behavior

**Step 4: Run final verification**

Run:
- `npx tsc --noEmit`
- `npm run lint`

Expected: no new lint/type errors.

**Step 5: Commit**

```bash
git add doc/問題描述.md docs/plans/2026-04-05-doso-category-mapping-design.md
git commit -m "補充DOSO自動分類映射文件"
```

## Final Validation Checklist

- Mapping config can be saved and loaded for all 9 DOSO directories.
- L1 is fixed to Japan and included in publish payload.
- Batch publish works without manual category picking for mapped directories.
- Missing mapping fails only affected items, with clear reason.
- Single publish modal auto-fills mapping and blocks publish when missing mapping.
- `npx tsc --noEmit` passes.
- `npm run lint` has no new errors.
