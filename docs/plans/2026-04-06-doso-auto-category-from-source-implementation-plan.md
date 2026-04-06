# DOSO Source Category Auto-Creation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 讓 DOSO 導入商品在不手動指定 L1/L2/L3 的情況下，若具備來源分類資訊即可自動建立對應分類並成功上架。

**Architecture:** 維持單一上架入口 `/api/publish-product`，由後端集中決策分類來源（自動建立 > 映射 > fallback > 手動 category_ids）。前端 `CrawlerImport` 單筆與批量上架統一補送 `source_category_name`，提升自動分類命中率。資料表不變，沿用既有 `products` 與關聯表 upsert/重建流程。

**Tech Stack:** Next.js App Router、TypeScript、Supabase。

---

### Task 1: 補齊前端 payload 的來源分類名稱

**Files:**
- Modify: `src/components/admin/CrawlerImport.tsx`
- Test: 手動驗證（導入頁）

**Step 1: Write the failing test**

目前沒有自動化前端測試框架，使用可重現手動案例作為失敗測試：
- 在導入清單選擇一筆含來源分類商品
- 單筆點「上架」
- 觀察 Network `POST /api/publish-product` Request Payload 未包含或常為空的 `source_category_name`

**Step 2: Run test to verify it fails**

Run: `npm run dev`
Expected: 單筆/批量 payload 中 `source_category_name` 缺失或為空值。

**Step 3: Write minimal implementation**

在單筆與批量 payload 產生邏輯中，新增 `source_category_name`：
- 優先讀取商品來源欄位（例如 `sourceCategoryName`）
- 缺失時送空字串（讓後端可 fallback）

**Step 4: Run test to verify it passes**

Run: `npm run dev`
Expected: Network payload 內可見 `source_category_name`，且有值時正確傳遞。

**Step 5: Commit**

```bash
git add src/components/admin/CrawlerImport.tsx
git commit -m "改善DOSO上架payload來源分類名稱傳遞"
```

### Task 2: 後端優先以來源分類自動建立分類

**Files:**
- Modify: `src/app/api/publish-product/route.ts`
- Modify: `src/lib/doso/sourceCategoryStore.ts` (若需補強名稱 fallback 或防呆)
- Test: 手動 API 驗證（導入後上架）

**Step 1: Write the failing test**

手動失敗案例：
- 商品具備 `source_directory_url` 與來源分類資訊
- 不傳 `category_ids`
- `POST /api/publish-product` 回 `400 missing_category_mapping`

**Step 2: Run test to verify it fails**

Run: `npm run dev`
Expected: 目前流程在無手動 L1/L2/L3 時仍有機率 400 失敗。

**Step 3: Write minimal implementation**

在 API 中調整分類解析優先序：
1. `resolveOrCreateCategoryByDosoSource(source_category_id, source_category_name, directoryUrl)`
2. `resolveMappedCategoryBySourceCategoryId(...)`
3. `resolveDirectoryFallbackCategory(...)`
4. 最後才使用傳入 `category_ids`

並確保：
- 成功取得 `l1_id/l2_id[/l3_id]` 即覆寫 `resolvedCategoryIds`
- 失敗時回傳明確錯誤碼（維持 `missing_category_mapping`）

**Step 4: Run test to verify it passes**

Run: `npm run dev`
Expected: 導入商品在未手動選 L1/L2/L3 時可自動建立分類並成功回傳 `200`。

**Step 5: Commit**

```bash
git add src/app/api/publish-product/route.ts src/lib/doso/sourceCategoryStore.ts
git commit -m "調整上架API優先以來源分類自動建分類"
```

### Task 3: 型別與靜態驗證

**Files:**
- Modify: `src/components/admin/CrawlerImport.tsx`（必要時型別補強）
- Modify: `src/app/api/publish-product/route.ts`（必要時型別補強）
- Test: `npm run lint`, `npx tsc --noEmit`

**Step 1: Write the failing test**

以靜態檢查作為驗證門檻。

**Step 2: Run test to verify it fails**

Run: `npm run lint && npx tsc --noEmit`
Expected: 若有型別/風格問題，指令失敗並顯示對應檔案行數。

**Step 3: Write minimal implementation**

僅修正因本次變更導致的 lint/type 問題，不做額外重構。

**Step 4: Run test to verify it passes**

Run: `npm run lint && npx tsc --noEmit`
Expected: 全部通過。

**Step 5: Commit**

```bash
git add src/components/admin/CrawlerImport.tsx src/app/api/publish-product/route.ts
git commit -m "修正自動分類上架相關型別與檢查"
```

### Task 4: 回歸驗證（單筆/批量）

**Files:**
- Test: 管理後台導入與上架流程

**Step 1: Write the failing test**

列出兩條回歸路徑：
- 單筆導入商品直接上架
- 批量導入商品直接上架

**Step 2: Run test to verify it fails**

Run: `npm run dev`
Expected: 變更前可重現 400 上架失敗。

**Step 3: Write minimal implementation**

不新增實作，僅執行回歸驗證。

**Step 4: Run test to verify it passes**

Run: `npm run dev`
Expected:
- 兩條路徑均可在有來源分類資訊時直接上架成功
- 關聯分類在後台可見，且掛在日本 L1 下

**Step 5: Commit**

```bash
git add -A
git commit -m "完成DOSO導入商品自動來源分類上架驗證"
```
