# DOSO 上架分類確認與本次合併流程設計

## 背景與問題

目前 DOSO 導入商品在上架時，分類主要由來源資料與目錄自動推導。`CrawlerImport` 內既有的「上架前手動選 L1/L2/L3」實際上常被後端自動分類覆蓋，造成管理員誤以為已生效，並持續出現大量數字分類（例如純數字或不易辨識名稱）。

目標是：

1. 移除無效的前置手動分類操作。
2. 在真正上架瞬間，針對「即將新增分類」或「疑似異常分類」進行顯示與確認。
3. 允許管理員僅對本次商品合併到既有分類，不寫入長期映射。
4. 讓管理員可快速清理已產生的異常分類。

## 設計原則

- 分類來源單一：上架分類以來源推導為主，不在上架前手動指定。
- 修正時機正確：只有在「點上架」當下才詢問是否改合併。
- 變更範圍最小：本次合併僅影響當次上架 payload，不改 `source-category-mapping`。
- 風險可見：任何會新建分類或可疑分類都需明確顯示原因。

## 使用流程（UX）

### 1) 批量上架前區塊調整

- 移除 `CrawlerImport` 的「上架前：預設分類與標籤」中的 L1/L2/L3 選擇控件。
- UI 改為顯示只讀資訊：
  - `分類模式：來源自動判定`
  - `L1：日本（系統預設）`
- 標籤選擇區保留。

### 2) 單筆上架（點擊商品卡「上架」）

1. 使用者點擊上架。
2. 前端先呼叫 `publish preview`（不寫入 DB）。
3. 若無風險，直接送 `confirm` 完成上架。
4. 若命中風險（會新建分類 / 可疑分類），彈出「分類確認彈窗」：
   - 顯示來源分類資訊與系統預計新增的 L2/L3。
   - 提供兩種操作：
     - `接受本次新增`
     - `改為合併到既有分類（本次）`
5. 選擇合併時，顯示 L2/L3 選擇器（依既有父子關係過濾）。
6. 送 `confirm`：
   - 接受新增：不帶手動覆蓋欄位。
   - 合併：帶 `manual_merge_category_ids`。

### 3) 批量上架

1. 前端先逐筆 `preview`。
2. 將無風險商品歸入「可直接上架」，風險商品歸入「待分類確認」。
3. 管理員在待確認清單逐筆選擇：接受新增或本次合併。
4. 逐筆送 `confirm`，彙總成功/失敗數。

## 架構與元件變更

### 前端（`src/components/admin/CrawlerImport.tsx`）

- 移除欄位與 state：
  - `selectedCrawlerL1`, `selectedCrawlerL2`, `selectedCrawlerL3`
  - `publishForm.l1Id/l2Id/l3Id`
- 新增 state：
  - `showCategoryReviewModal`
  - `categoryReviewResult`
  - `manualMergeSelection`（L2/L3）
  - 批量情境的 `pendingCategoryReviews`
- 新增函式：
  - `previewPublish(payload)`
  - `confirmPublish(payload, manualMerge?)`
  - `openCategoryReviewModal(previewResult)`

### 後端（`src/app/api/publish-product/route.ts`）

- 擴充 request 欄位：
  - `category_review_mode?: "preview" | "confirm"`
  - `manual_merge_category_ids?: number[]`（格式固定 `[l1, l2, l3?]`）
- `preview` 模式：
  - 僅解析分類，不建立/更新商品，不寫任何關聯。
  - 回傳推導結果與風險旗標。
- `confirm` 模式：
  - 若有 `manual_merge_category_ids`，優先採用。
  - 否則沿用既有自動推導流程。

### 分類管理清理（`src/components/admin/CategoryManager.tsx`）

- 新增「可疑分類」視圖：
  - 規則：名稱純數字、數字比例過高、slug 命中 `DOSO_*_L2_`/`DOSO_*_L3_`。
- 支援多選停用（`active=false`）以快速清理。

## API 契約（草案）

### Request（preview）

```json
{
  "sku": "X123",
  "title": "...",
  "source_category_id": "12345",
  "source_category_name": "12345",
  "source_directory_url": "https://www.doso.net/onlineMall/...",
  "category_review_mode": "preview"
}
```

### Response（preview，風險案例）

```json
{
  "ok": true,
  "category_review": {
    "needs_review": true,
    "would_auto_create": true,
    "risk_flags": ["numeric_name", "auto_create"],
    "proposed_category": {
      "l1_id": 1,
      "l2_name": "12345",
      "l3_name": null
    },
    "source": {
      "source_category_id": "12345",
      "source_category_name": "12345",
      "directory_url": "https://www.doso.net/..."
    }
  }
}
```

### Request（confirm + 本次合併）

```json
{
  "sku": "X123",
  "title": "...",
  "status": "published",
  "tag_ids": [1, 2],
  "image_urls": ["..."],
  "source_category_id": "12345",
  "source_category_name": "12345",
  "source_directory_url": "https://www.doso.net/...",
  "category_review_mode": "confirm",
  "manual_merge_category_ids": [1, 24, 87]
}
```

## 資料流與優先序

1. `manual_merge_category_ids`（若提供且合法）
2. 既有 `by_source_category_id` 映射
3. 既有 `directory_fallback`
4. 既有 auto-create 流程
5. 若仍無有效 L1/L2，回傳 `missing_category_mapping`

## 錯誤處理

- `invalid_manual_merge_category`
- `invalid_manual_merge_hierarchy`
- `missing_category_after_review`
- `missing_category_mapping`（沿用）

前端訊息原則：提供可操作指引（例如「請改選符合 L1->L2 關係的分類」）。

## 測試與驗收標準

### 功能驗收

1. 上架前畫面不可手動選 L1/L2/L3。
2. 單筆上架遇到風險分類時一定彈窗。
3. 選「接受新增」後，可正常以上游推導分類上架。
4. 選「本次合併」後，商品分類為管理員所選，且不改長期映射設定。
5. 批量上架可先集中完成風險分類確認，再執行上架。
6. 分類管理可批次停用可疑分類。

### 技術驗收

- `npm run lint` 通過。
- `npx tsc --noEmit` 通過。
- 手動驗證至少三種情境：
  - 正常映射
  - 數字分類（需彈窗）
  - 合併到既有分類

## 不做事項（本期）

- 不將本次合併結果寫入永久映射。
- 不改動既有 DOSO 類別快取資料結構。
- 不新增自動批次重命名分類機制。
