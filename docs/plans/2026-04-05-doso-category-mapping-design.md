# DOSO 目錄自動分類設計（段 A）

日期: 2026-04-05
狀態: 已核准
範圍: 管理後台 DOSO 導入後上架分類自動化

## 背景

目前 admin 在上架前仍需手動選擇分類，流程重複且容易漏選。對 DOSO 來源來說，L1 固定為日本，手動指定分類意義低。

本設計先做段 A：

- 建立「DOSO 目錄 URL -> L2/L3」固定映射。
- 上架時自動套用映射，不再依賴每次手選分類。

## 目標

1. L1 固定為日本。
2. 每個 DOSO 目錄可在後台預先設定 L2/L3。
3. 批量上架時自動帶入分類。
4. 若映射缺失，回報明確錯誤，不中斷整批流程。

## 非目標

- 本階段不做關鍵字分類。
- 本階段不做 AI 推論分類。
- 本階段不改動非 DOSO 來源商品流程。

## 方案選型

採用「目錄固定對應」：

- URL 穩定、結果可預期。
- 維護成本最低。
- 對營運端操作最直覺。

## 資料模型

沿用 `system_settings`：

- `key`: `doso_category_mapping_v1`
- `value`:

```json
{
  "l1_japan_id": 123,
  "mappings": {
    "https://www.doso.net/onlineMall/selfOperatedMall": {
      "l2_id": 456,
      "l3_id": 789
    },
    "https://www.doso.net/onlineMall/etonet": {
      "l2_id": 456,
      "l3_id": null
    }
  },
  "updated_at": "2026-04-05T00:00:00.000Z"
}
```

規則：

- `l1_japan_id` 必填且固定為日本。
- `l2_id` 必填。
- `l3_id` 可空。

## API 設計

### 1) 讀取映射

`GET /api/admin/sync/doso/category-mapping`

回傳：

- `ok`
- `l1_japan_id`
- `mappings`

### 2) 儲存映射

`PUT /api/admin/sync/doso/category-mapping`

請求：

- `l1_japan_id`
- `mappings`

驗證：

- URL 必須在 DOSO 9 個已知目錄中。
- `l2_id` 必須存在。
- `l3_id` 若存在，需符合類別關聯。

## 上架流程調整

### 批量上架

來源：`CrawlerImport` 的批量上架流程。

新增邏輯：

1. 由商品 `original_url` 或目錄上下文判斷所屬 DOSO 目錄。
2. 讀取映射，組出 `category_ids = [l1_japan_id, l2_id, l3_id?]`。
3. 若該目錄未映射：
   - 該商品標記失敗
   - 失敗原因：`missing_category_mapping`
   - 不中斷其他商品

### 單筆上架彈窗

- 顯示映射結果（唯讀提示即可）。
- 若無映射，顯示警告並阻止送出。

## 後台 UI 設計

位置：`src/components/admin/CrawlerImport.tsx`

新增「DOSO 分類映射」區塊：

- 固定列出 9 個目錄。
- 每列可選 L2 與 L3（L3 可不選）。
- 顯示映射完整度（已設定 X/9）。
- `儲存映射` 按鈕。

## 錯誤處理

- `missing_category_mapping`: 目錄尚未設定映射
- `invalid_mapping_category`: 映射類別不存在或不合法
- `invalid_l1_japan_id`: 日本 L1 設定錯誤

前端顯示友善中文訊息，避免裸露內部錯誤。

## 驗收標準

1. 可儲存並讀取 9 個 DOSO 目錄映射。
2. 批量上架無需手動挑分類，會自動套用 L1 日本 + L2/L3。
3. 未映射目錄的商品不會誤上架，且會回報明確失敗原因。
4. 單筆上架在無映射時會提示並阻止送出。

## 影響檔案（預估）

- `src/components/admin/CrawlerImport.tsx`
- `src/app/api/admin/sync/doso/category-mapping/route.ts`（新增）
- `src/lib/doso/types.ts`
- `src/app/api/publish-product/route.ts`（或批量上架調用處）
