# DOSO 上架分類確認與本次合併 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 移除上架前無效分類選擇，改為上架時預檢分類，並在風險情境下讓管理員本次合併到既有分類。

**Architecture:** 前端 `CrawlerImport` 先呼叫 `publish-product` 的 `preview` 模式取得分類風險判定，再決定直接上架或開啟分類確認彈窗。後端在同一路由新增 `category_review_mode` 與 `manual_merge_category_ids`，`confirm` 時優先採用手動合併分類。分類管理頁新增可疑分類清理操作，減少已產生垃圾分類。

**Tech Stack:** Next.js App Router, TypeScript, React, Supabase

---

### Task 1: 型別與 API 契約擴充

**Files:**
- Modify: `src/lib/doso/types.ts`
- Modify: `src/app/api/publish-product/route.ts`
- Test: `npx tsc --noEmit`

**Step 1: Write the failing type expectations**

在 `src/lib/doso/types.ts` 新增/擴充型別：

```ts
export type PublishCategoryReviewMode = "preview" | "confirm";

export interface PublishCategoryReview {
  needs_review: boolean;
  would_auto_create: boolean;
  risk_flags: string[];
  proposed_category: {
    l1_id: number | null;
    l2_id?: number | null;
    l3_id?: number | null;
    l2_name?: string | null;
    l3_name?: string | null;
  };
}
```

**Step 2: Run type check to verify current code has gaps**

Run: `npx tsc --noEmit`
Expected: FAIL（在 API/前端使用新欄位前出現型別缺口）

**Step 3: Write minimal API request parsing for new fields**

在 `src/app/api/publish-product/route.ts` 增加：

```ts
const categoryReviewMode = body?.category_review_mode === "preview" ? "preview" : "confirm";
const manualMergeCategoryIds = Array.isArray(body?.manual_merge_category_ids)
  ? body.manual_merge_category_ids.map((x: any) => Number(x)).filter((x: number) => Number.isInteger(x) && x > 0)
  : [];
```

**Step 4: Run type check to verify pass**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/doso/types.ts src/app/api/publish-product/route.ts
git commit -m "新增上架分類預檢與本次合併欄位契約"
```

### Task 2: `publish-product` 新增 preview/confirm 分流

**Files:**
- Modify: `src/app/api/publish-product/route.ts`
- Test: `npm run lint`

**Step 1: Write failing behavior expectation (manual test note in code comments/todo)**

定義預期：`preview` 不寫 DB，僅回傳 `category_review`。

**Step 2: Run lint baseline**

Run: `npm run lint`
Expected: PASS 或顯示與本任務相關警告（待修）

**Step 3: Implement minimal preview branch**

在分類解析後、寫入商品前加入：

```ts
if (categoryReviewMode === "preview") {
  return NextResponse.json({
    ok: true,
    category_review: {
      needs_review,
      would_auto_create,
      risk_flags,
      proposed_category,
    },
  });
}
```

並補上 `manual_merge_category_ids` 優先覆蓋邏輯（僅在 `confirm`）。

**Step 4: Run lint/type checks**

Run: `npm run lint && npx tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/publish-product/route.ts
git commit -m "新增上架預檢流程並支援本次合併分類"
```

### Task 3: CrawlerImport 移除上架前手選分類，改為上架時分類確認

**Files:**
- Modify: `src/components/admin/CrawlerImport.tsx`
- Test: `npm run lint`

**Step 1: Write failing UI expectation**

預期畫面不再有可編輯的 L1/L2/L3 下拉，改為只讀「分類模式：來源自動判定 / L1：日本」。

**Step 2: Run lint baseline for the file**

Run: `npm run lint`
Expected: PASS 或指出未使用 state（移除後會修正）

**Step 3: Write minimal implementation**

- 移除以下 state 與 payload 欄位：
  - `selectedCrawlerL1`, `selectedCrawlerL2`, `selectedCrawlerL3`
  - `publishForm.l1Id/l2Id/l3Id`
  - batch payload `category_ids`
- 新增流程函式：
  - `previewPublish(payload)`
  - `confirmPublish(payload, manualMergeCategoryIds?)`
- 新增分類確認彈窗：
  - 顯示來源分類、預計新增分類、risk flags
  - 操作：接受新增 / 本次合併

**Step 4: Run lint/type checks**

Run: `npm run lint && npx tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/admin/CrawlerImport.tsx
git commit -m "改為上架時分類預檢與彈窗確認，移除前置手選分類"
```

### Task 4: 批量上架加入待確認清單

**Files:**
- Modify: `src/components/admin/CrawlerImport.tsx`
- Test: `npx tsc --noEmit`

**Step 1: Write failing behavior expectation**

預期：批量上架不再直接逐筆送 publish；先做 preview，風險商品進待確認清單。

**Step 2: Run type check baseline**

Run: `npx tsc --noEmit`
Expected: PASS（作為基準）

**Step 3: Implement minimal pending-review queue**

- 新增資料結構：

```ts
type PendingCategoryReviewItem = {
  productIndex: number;
  preview: any;
  manualMergeCategoryIds?: number[];
  decision?: "accept" | "merge";
};
```

- 批量流程：
  1. preview 全選商品
  2. 風險商品先確認
  3. 全部有 decision 後再 confirm 上架

**Step 4: Run type/lint checks**

Run: `npm run lint && npx tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/admin/CrawlerImport.tsx
git commit -m "批量上架加入分類待確認清單流程"
```

### Task 5: 分類管理新增可疑分類清理

**Files:**
- Modify: `src/components/admin/CategoryManager.tsx`
- Modify: `src/app/api/categories/[id]/route.ts` (必要時擴充批次停用 API，或另開批次 API)
- Test: `npm run lint`

**Step 1: Write failing behavior expectation**

預期：可過濾出可疑分類，支援多選後一次停用。

**Step 2: Run lint baseline**

Run: `npm run lint`
Expected: PASS

**Step 3: Implement minimal suspicious-category tooling**

- 前端判定規則：
  - `name` 純數字或數字比例高
  - `slug` 命中 `DOSO_.*_L2_` 或 `DOSO_.*_L3_`
- UI：
  - 「可疑分類」區塊
  - 勾選、全選、批次停用

**Step 4: Run lint/type checks**

Run: `npm run lint && npx tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/admin/CategoryManager.tsx src/app/api/categories/[id]/route.ts
git commit -m "新增可疑分類篩選與批次停用工具"
```

### Task 6: 驗證與文件更新

**Files:**
- Modify: `docs/plans/2026-04-08-doso-publish-category-review-design.md`
- (Optional) Modify: `README.md`（若有管理流程說明）

**Step 1: Manual QA script**

手動驗證三條路徑：

1. 正常來源分類：不彈窗，直接上架。
2. 數字來源分類：必彈窗，接受新增可上架。
3. 數字來源分類：選本次合併，商品掛到既有 L2/L3。

**Step 2: Run final checks**

Run: `npm run lint && npx tsc --noEmit`
Expected: PASS

**Step 3: Update docs**

在設計文件補上最終 API 實際 response 範例與 UI 截圖路徑（若有）。

**Step 4: Commit**

```bash
git add docs/plans/2026-04-08-doso-publish-category-review-design.md README.md
git commit -m "補上分類預檢與本次合併流程驗證紀錄"
```
