# 管理員商品條件硬刪除功能設計

日期: 2026-04-06
狀態: 已核准
範圍: Admin 商品管理一鍵條件硬刪除

## 背景

目前後台商品管理僅支援單筆刪除與勾選批量刪除。缺少「依條件一次清除舊資料」能力，導致大量過期商品或特定 L1 商品清理效率低且操作繁瑣。

## 目標

1. 在管理員商品管理提供一鍵條件硬刪除。
2. 支援天數條件：超過 60 天或超過 X 天（X 可輸入，預設 60）。
3. 支援分類條件：可選擇單一 L1，刪除該 L1 底下所有商品。
4. 支援條件模式切換：`OR` / `AND`。
5. 刪除採硬刪除，直接刪除資料庫 `products` 資料。

## 使用者確認的需求決策

- 條件組合模式: 提供 `OR` / `AND` 切換。
- 刪除確認機制: 使用現有 `confirm` 互動風格，不增加輸入 `DELETE`。
- 天數計算欄位: 使用 `created_at`。
- 分類範圍: 僅支援 L1；選擇 L1 時，刪除其所有下層分類商品。
- 天數輸入方式: 單一數字輸入（預設 60，可改為 X）。

## 方案評估與採用

### 方案 A（採用）

新增專用 API `POST /api/admin/products/bulk-delete`，由後端統一計算條件並執行硬刪除。

- 優點: 權責清楚、風險隔離、避免影響現有商品 API 行為。
- 缺點: 新增一支 API 與少量 UI。

### 方案 B（不採用）

擴充既有 `POST /api/products/batch`，加入 `action: delete_by_filter`。

- 風險: 與既有批次操作耦合，邊界不清，未來維護困難。

### 方案 C（不採用）

前端先查符合條件的 ID，再呼叫既有 `batch delete`。

- 風險: 二段式操作存在 race condition，且大量資料效能較差。

## 架構設計

### Admin 前端

修改 `src/components/admin/ProductManager.tsx`，新增「條件硬刪除」區塊：

- `days` 輸入框（正整數，預設 `60`）
- `mode` 切換（`OR` / `AND`）
- `l1CategoryId` 下拉（可不選）
- 執行按鈕（觸發 `confirm`）

### Admin 後端

新增 `src/app/api/admin/products/bulk-delete/route.ts`：

- 僅處理管理員條件刪除。
- 後端重新計算條件，不信任前端預算結果。
- 取得待刪 ID 後對 `products` 執行硬刪除。

## API 設計

### `POST /api/admin/products/bulk-delete`

Request body:

```json
{
  "days": 60,
  "mode": "or",
  "l1CategoryId": 12
}
```

欄位規則:

- `days`: 必填、正整數。
- `mode`: 必填，僅允許 `or` / `and`。
- `l1CategoryId`: 可選；未帶表示只用天數條件。

Response body:

```json
{
  "success": true,
  "matchedCount": 123,
  "deletedCount": 123
}
```

## 條件計算與資料流

1. 驗證參數。
2. 計算 `cutoff = now - days`，基準欄位為 `products.created_at`。
3. 若有 `l1CategoryId`:
   - 驗證該分類存在且 `level = 1`。
   - 透過 `category_relations` 展開 L1 子樹（含 L2/L3）。
   - 由 `product_category_map` 找出此子樹涵蓋的商品 ID 集合。
4. 依模式組合條件:
   - `or`: `created_at <= cutoff` 或 `in l1 subtree product ids`
   - `and`: `created_at <= cutoff` 且 `in l1 subtree product ids`
5. 對最終 ID 集合進行硬刪除。
6. 回傳 `matchedCount` 與 `deletedCount`。

## 錯誤處理與邊界

- 參數不合法（days/mode/l1CategoryId）: 回 `400`。
- `l1CategoryId` 不存在或不是 L1: 回 `400`。
- 無符合資料: 回 `200` 並回傳 `deletedCount = 0`。
- 大量 ID 時採分批刪除（例如 500/批）避免 SQL 參數過長。
- 伺服器記錄操作條件與刪除筆數，便於追查。

## 權限與安全

- API 路由位於 `/api/admin/*` 命名空間。
- 僅由管理端 UI 觸發。
- 使用 `confirm` 顯示摘要（天數、模式、L1 名稱）降低誤刪風險。

## 對既有功能影響

- 不改動既有 `單筆刪除` 與 `勾選批量刪除` 行為。
- 不改動既有 `GET /api/products` 查詢流程。
- 新功能與既有批次 API 解耦。

## 驗證計畫

1. 前端互動:
   - 可輸入天數、切換 `OR/AND`、選擇 L1。
   - confirm 內容與實際送出條件一致。
2. API 行為:
   - `OR` / `AND` 條件結果正確。
   - 只天數、只 L1（依模式）、天數+L1 皆可正常處理。
   - 參數錯誤回應正確錯誤碼。
3. 回歸:
   - 單筆刪除、勾選批量刪除維持可用。
4. 靜態檢查:
   - `npm run lint`
   - `npx tsc --noEmit`

## 驗收標準

1. 管理員可在商品管理中設定天數 X 並一鍵硬刪除超過 X 天商品。
2. 管理員可選擇單一 L1 並刪除該 L1 底下商品。
3. 管理員可切換 `OR` / `AND` 決定條件組合邏輯。
4. 刪除完成後可回報刪除筆數並刷新列表。
5. 既有刪除功能不受影響。

## 非目標

- 本階段不做軟刪除或回收桶。
- 本階段不提供 L2/L3 精細分類刪除。
- 本階段不做刪除排程（cron）與自動化清理。
