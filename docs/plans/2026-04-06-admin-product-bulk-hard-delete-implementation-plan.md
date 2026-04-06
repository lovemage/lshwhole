# 管理員商品條件硬刪除功能 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在管理員商品管理中新增可依「超過 X 天」與「指定 L1」條件的一鍵硬刪除，並支援 OR/AND 條件模式。

**Architecture:** 前端在 `ProductManager` 新增條件刪除控制區；後端新增專用 admin API 統一驗證參數、展開 L1 子樹、計算符合商品 ID 並執行硬刪除。刪除邏輯集中在 server side，前端只傳條件，避免誤刪與資料競態。

**Tech Stack:** Next.js App Router API Routes, TypeScript, Supabase Admin client, React hooks, ESLint, TypeScript compiler.

---

### Task 1: 建立後端刪除邏輯模組（純函式）

**Files:**
- Create: `src/lib/admin/productBulkDelete.ts`
- Modify: `src/types/`（若需要新增型別，新增 `src/types/adminProductBulkDelete.ts`）

**Step 1: 先寫「失敗中的規格註解」**

- 在 `src/lib/admin/productBulkDelete.ts` 先建立型別與 TODO 驗收條件註解（mode 檢查、days 檢查、L1 展開、OR/AND 合併）。

**Step 2: 實作最小可用的參數驗證函式**

- 實作 `parseBulkDeleteInput(body)`：
  - `days` 必須為正整數。
  - `mode` 只允許 `"or" | "and"`。
  - `l1CategoryId` 可選，若存在需轉成數字。

**Step 3: 實作 L1 子樹展開函式**

- 實作 `resolveL1DescendantCategoryIds(admin, l1CategoryId)`：
  - 驗證分類存在且 `level = 1`。
  - 讀取 `category_relations`，用 BFS/DFS 找出所有後代分類。

**Step 4: 實作條件 ID 計算函式**

- 實作 `resolveMatchedProductIds(admin, input)`：
  - 取得 `created_at <= cutoff` 的商品 ID 集。
  - 若有 L1，取得該 L1 子樹商品 ID 集。
  - 依 `mode` 做聯集或交集。

**Step 5: 本地型別與語法檢查**

Run: `npx tsc --noEmit`
Expected: 無 TypeScript 錯誤。

**Step 6: Commit**

```bash
git add src/lib/admin/productBulkDelete.ts src/types/adminProductBulkDelete.ts
git commit -m "新增商品條件硬刪除後端邏輯模組"
```

### Task 2: 新增 Admin API 路由

**Files:**
- Create: `src/app/api/admin/products/bulk-delete/route.ts`
- Modify: `src/lib/admin/productBulkDelete.ts`

**Step 1: 先建立失敗流程**

- 在 route 中先回傳 `501`（暫未完成），確認路由位置與 method 正確。

**Step 2: 接上參數驗證與條件計算**

- `POST` 解析 body，呼叫 `parseBulkDeleteInput` 與 `resolveMatchedProductIds`。

**Step 3: 實作硬刪除與分批**

- 以 500 筆為一批，對 `products` 執行 `.delete().in("id", batchIds)`。
- 累加 `deletedCount`，回傳 `{ success: true, matchedCount, deletedCount }`。

**Step 4: 完整錯誤回應**

- 參數錯誤/L1 錯誤回 `400`。
- 非預期錯誤回 `500`。

**Step 5: 檢查**

Run: `npm run lint`
Expected: 新 API 檔案無 lint 錯誤。

**Step 6: Commit**

```bash
git add src/app/api/admin/products/bulk-delete/route.ts src/lib/admin/productBulkDelete.ts
git commit -m "新增管理員商品條件硬刪除 API"
```

### Task 3: ProductManager 新增條件刪除狀態與事件

**Files:**
- Modify: `src/components/admin/ProductManager.tsx`

**Step 1: 先新增 state 與預設值**

- 新增：
  - `bulkDeleteDays`（預設 `60`）
  - `bulkDeleteMode`（`"or"`）
  - `bulkDeleteL1Id`（`null`）
  - `bulkDeleteLoading`（`false`）

**Step 2: 撰寫前端輸入驗證**

- days 非正整數時直接 `alert` 並阻擋送出。

**Step 3: 實作提交函式 `handleConditionalBulkDelete`**

- 顯示 `confirm`，摘要包含天數、模式、L1 名稱。
- 呼叫 `POST /api/admin/products/bulk-delete`。
- 成功後 `alert` 刪除筆數並 `fetchProducts(productPage, selectedProductL1)`。

**Step 4: 檢查**

Run: `npm run lint`
Expected: `ProductManager.tsx` 無新增 lint 錯誤。

**Step 5: Commit**

```bash
git add src/components/admin/ProductManager.tsx
git commit -m "新增商品管理條件硬刪除事件邏輯"
```

### Task 4: ProductManager 新增條件刪除 UI

**Files:**
- Modify: `src/components/admin/ProductManager.tsx`

**Step 1: 新增 UI 區塊（批量操作列旁）**

- 新增卡片/列，包含：
  - 天數輸入欄（number）
  - 模式選擇（OR/AND）
  - L1 下拉（可空）
  - 「條件硬刪除」按鈕

**Step 2: L1 選單資料來源**

- 使用既有 `categories.filter(c => c.level === 1)`。

**Step 3: 互動細節**

- `bulkDeleteLoading` 時 disable 按鈕。
- 執行中顯示「刪除中...」。

**Step 4: 檢查**

Run: `npm run lint`
Expected: JSX 結構與 hooks 無告警。

**Step 5: Commit**

```bash
git add src/components/admin/ProductManager.tsx
git commit -m "新增商品管理條件硬刪除介面"
```

### Task 5: 回歸既有刪除流程與錯誤訊息一致性

**Files:**
- Modify: `src/components/admin/ProductManager.tsx`
- Modify: `src/app/api/admin/products/bulk-delete/route.ts`

**Step 1: 對齊提示文案**

- 成功訊息: 顯示 `刪除成功，共刪除 N 件商品`。
- 無匹配訊息: `沒有符合條件的商品`。

**Step 2: 確認舊流程不受影響**

- 單筆刪除 `deleteProduct` 仍可用。
- 勾選批量刪除 `batchDelete` 仍可用。

**Step 3: 檢查**

Run: `npm run lint && npx tsc --noEmit`
Expected: 均通過。

**Step 4: Commit**

```bash
git add src/components/admin/ProductManager.tsx src/app/api/admin/products/bulk-delete/route.ts
git commit -m "調整條件硬刪除提示並完成回歸"
```

### Task 6: 手動驗證清單

**Files:**
- Modify: `docs/plans/2026-04-06-admin-product-bulk-hard-delete-implementation-plan.md`（勾選執行結果）

**Step 1: 驗證 OR 模式**

- 條件：`days=60`、`mode=or`、選定某 L1。
- 預期：符合「超過 60 天」或「L1 子樹」商品都被刪除。

**Step 2: 驗證 AND 模式**

- 條件：`days=60`、`mode=and`、同一 L1。
- 預期：僅刪除同時滿足兩條件商品。

**Step 3: 驗證只用天數**

- 條件：`days=90`、不選 L1。
- 預期：僅刪除超過 90 天商品。

**Step 4: 驗證異常情境**

- `days=0`、`days=-1`、`days=abc`、無效 L1 id。
- 預期：前後端皆阻擋，顯示清楚錯誤訊息。

**Step 5: Commit**

```bash
git add docs/plans/2026-04-06-admin-product-bulk-hard-delete-implementation-plan.md
git commit -m "補上商品條件硬刪除手動驗證結果"
```

### Task 7: 最終交付檢查

**Files:**
- Modify: `docs/plans/2026-04-06-admin-product-bulk-hard-delete-design.md`（若需補充實作差異）

**Step 1: 最終檢查命令**

Run: `npm run lint && npx tsc --noEmit && npm run build`
Expected: 全部成功。

**Step 2: PR 說明草稿**

- 說明新增 API、前端 UI、OR/AND 規則、刪除為硬刪除。
- 附上手動驗證步驟與結果。

**Step 3: Commit（若有文件補充）**

```bash
git add docs/plans/2026-04-06-admin-product-bulk-hard-delete-design.md
git commit -m "補充商品條件硬刪除設計與交付說明"
```
