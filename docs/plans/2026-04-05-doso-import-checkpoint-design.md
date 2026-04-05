# DOSO 導入 Checkpoint 與去重設計

日期: 2026-04-05
狀態: 已核准
相關頁面: `src/components/admin/CrawlerImport.tsx`
相關服務: `src/lib/doso/probeService.ts`

## 背景與目標

目前 DOSO 導入流程只做單次回傳的 `productCode` 去重，缺少跨次導入的 checkpoint，且 UI 可同時輸入多個目錄 URL。此次需求為：

1. 支援「續傳 checkpoint」，避免重複導入，並可在下次繼續。
2. 自動跳過已導入過商品。
3. 目錄 URL 一次只能選擇一個。
4. 必須顯示總商品數與目前進度。

本案已確定「已導入過」規則採 A：
- 若 `productCode` 已存在於資料庫商品 `products.sku`，或已在本次 session 處理過，即視為已導入，應自動跳過。

## 設計原則

- 以資料庫作為 checkpoint 真實來源，確保跨裝置、跨時段可續傳。
- 導入流程可中斷可恢復，且具可觀測進度。
- 單筆失敗不拖垮整批導入。
- 前端只允許單一目錄 URL，避免 session 語意混淆。

## 整體方案（採用）

採用「DB 型 checkpoint + session 化導入流程」：

- 新增導入 session 表記錄全域進度與狀態。
- 新增導入 item 表記錄每個 `productCode` 的處理狀態。
- 導入執行採批次推進，批次完成即落盤 checkpoint。
- 透過 `products.sku` 與 session items 進行雙重跳過判斷。

## 資料模型

### `doso_import_sessions`

建議欄位：

- `id BIGINT` 主鍵
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`
- `admin_user_id UUID`（啟動人）
- `target_url TEXT NOT NULL`（單一目錄 URL）
- `status TEXT NOT NULL`（`pending | running | paused | completed | failed`）
- `total_count INTEGER NOT NULL DEFAULT 0`
- `processed_count INTEGER NOT NULL DEFAULT 0`
- `imported_count INTEGER NOT NULL DEFAULT 0`
- `skipped_count INTEGER NOT NULL DEFAULT 0`
- `failed_count INTEGER NOT NULL DEFAULT 0`
- `last_checkpoint_product_code TEXT`（最新成功處理 checkpoint）
- `error_message TEXT`（session 層級錯誤）

索引建議：

- `(status, created_at desc)` 供前端快速查最近未完成 session。

### `doso_import_items`

建議欄位：

- `id BIGINT` 主鍵
- `session_id BIGINT NOT NULL` FK -> `doso_import_sessions(id)`
- `product_code TEXT NOT NULL`
- `status TEXT NOT NULL`（`pending | imported | skipped_existing | failed`）
- `reason TEXT`（例如 `existing_sku`、`duplicate_in_session`、`detail_fetch_failed`）
- `payload JSONB`（當下商品快照）
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

約束與索引建議：

- UNIQUE(`session_id`, `product_code`) 防止同 session 重複處理。
- INDEX(`session_id`, `status`) 供進度統計。

## API 設計

### 1) 建立導入 session

`POST /api/admin/sync/doso/import/start`

Request:

```json
{
  "username": "...",
  "password": "...",
  "targetUrl": "https://www.doso.net/..."
}
```

行為：

- 驗證管理員權限與 DOSO 帳密。
- 僅接受單一 `targetUrl`。
- 抓取該目錄列表後建立 `doso_import_sessions`。
- 預先寫入 `doso_import_items`（初始 `pending`），填入 `total_count`。

Response（摘要）：

- `sessionId`
- `total_count`
- 初始 counters

### 2) 執行/續傳導入

`POST /api/admin/sync/doso/import/:sessionId/run`

Request:

```json
{
  "batchSize": 20
}
```

行為：

- 只處理該 session 中 `pending` 的下一批 items。
- 每筆先判斷是否需跳過：
  - `products.sku == product_code` -> `skipped_existing`
  - item 已非 `pending`（防重入） -> 不重處理
- 非跳過者才執行 detail 抽取並組成導入清單資料。
- 每筆完成即更新 item 狀態；每批完成更新 session counters 與 checkpoint。
- 無 `pending` 時將 session 轉 `completed`。

Response（摘要）：

- `processedInBatch`、`importedInBatch`、`skippedInBatch`、`failedInBatch`
- 最新 session counters
- 本批成功導入產品資料（供前端 append）

### 3) 查詢進度

`GET /api/admin/sync/doso/import/:sessionId/progress`

Response:

- `status`
- `total_count`
- `processed_count`
- `imported_count`
- `skipped_count`
- `failed_count`
- `last_checkpoint_product_code`

### 4) 暫停（可選但建議）

`POST /api/admin/sync/doso/import/:sessionId/pause`

行為：

- 將 `running` -> `paused`，避免前端離開時狀態不一致。

## 前端流程與 UI 調整

檔案：`src/components/admin/CrawlerImport.tsx`

1. URL 輸入限制
- 將現有可多行 `textarea` 改為單一 `input`。
- 僅接受一個 `https://www.doso.net/...`。

2. 操作按鈕
- `開始導入`：建立 session。
- `繼續導入`：對未完成 session 執行 `run`。
- `暫停`（可選）：呼叫 pause。

3. 進度資訊（必備）
- 顯示 `總商品數 total_count`。
- 顯示 `目前進度 processed_count / total_count`。
- 顯示 `imported / skipped / failed`。
- 顯示進度條與百分比。

4. 導入清單整合
- 每次 `run` 回傳本批 imported 結果，append 到現有導入清單。
- `skipped` 不進清單，但需顯示跳過數與原因摘要。

5. 重新進入頁面
- 優先查最近 `running/paused` session，提供一鍵續傳。

## 去重與跳過規則

優先順序：

1. session item 非 `pending`：不重複處理。
2. `products.sku` 已存在：標記 `skipped_existing`。
3. 其餘：進入導入流程。

說明：

- 現有 `runDosoImportPreview` 的單次 Map 去重會保留，作為同批保護。
- 新增 session/item 機制提供跨批次、跨次導入去重與續傳能力。

## 錯誤處理與復原

- DOSO 登入失敗：session 標記 `failed`，前端提示。
- 單筆 detail 抽取失敗：item 設 `failed`，其餘繼續。
- 網路中斷或頁面關閉：已處理資料已落盤，再次 `run` 從 `pending` 接續。
- 目錄無商品：`total_count=0`，session 可直接 `completed`。

## 驗收標準

1. 可在中斷後續傳，不重複導入相同 `productCode`。
2. 已存在於 `products.sku` 的商品自動跳過，並可見跳過數。
3. UI 一次僅允許單一目錄 URL。
4. UI 全程顯示總數與目前進度（含百分比和 counters）。

## 實作影響範圍

- 前端：`src/components/admin/CrawlerImport.tsx`
- API：`src/app/api/admin/sync/doso/import/*`（新增 start/run/progress/pause）
- 服務：`src/lib/doso/probeService.ts`（抽出可重用 list/detail 抽取能力）
- 型別：`src/lib/doso/types.ts`
- DB migration：新增 session/item 兩張表與索引

## 非目標

- 本次不處理平行多 session 的排程系統。
- 本次不加入跨站來源的通用化導入框架。
