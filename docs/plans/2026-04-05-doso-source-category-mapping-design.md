# DOSO 來源分類同步映射設計

日期: 2026-04-05
狀態: 已核准
範圍: DOSO 導入後自動分類上架

## 背景

單純用「目錄 URL -> L2/L3」映射，對大目錄（例如批發商城 5000+ 商品）不夠精準。DOSO 站內已有分類樹，可直接作為商品自動分類依據。

## 目標

1. 同步 DOSO 來源分類樹（至少 L1/L2 級）。
2. 建立「來源分類 ID -> 站內分類（L2/L3）」映射。
3. 上架時優先用商品自身來源分類映射，自動套用分類。
4. 若來源分類缺失或未映射，再 fallback 到目錄預設分類。

## 設計原則

- 以來源分類 ID 做主鍵，不用分類名稱（避免名稱變動）。
- 為避免不同 DOSO 目錄使用相同來源分類 ID，實際映射 key 優先使用 `directory_url::source_category_id`。
- 支援 fallback，避免某些來源（如排行榜）中斷整批上架。
- 分類映射由 admin 維護，不需每次上架手動選分類。

## 資料模型

沿用 `system_settings`，新增兩組設定：

### 1) DOSO 來源分類快取

- key: `doso_source_categories_v1`
- value:
  - `updated_at`
  - `directories`: 每個目錄 URL 的來源分類節點陣列
  - 節點欄位：`source_category_id`、`name`、`parent_id`、`level`

### 2) DOSO 來源分類映射

- key: `doso_source_category_mapping_v1`
- value:
  - `l1_japan_id`（固定日本）
  - `by_source_category_id`
    - key: `directory_url::source_category_id`（主格式）
    - 向下相容：允許舊 key `source_category_id`
    - value: `{ l2_id, l3_id? }`
  - `directory_fallback`
    - key: 目錄 URL
    - value: `{ l2_id, l3_id? }`

## API 設計

### 1) 取得來源分類樹

`POST /api/admin/sync/doso/source-categories/refresh`

- 透過 DOSO 已登入流程拉各目錄分類樹
- 寫入 `doso_source_categories_v1`

### 2) 讀取來源分類 + 映射

`GET /api/admin/sync/doso/source-category-mapping`

- 回傳來源分類節點與現有映射設定

### 3) 儲存來源分類映射

`PUT /api/admin/sync/doso/source-category-mapping`

- 儲存 `by_source_category_id` 與 `directory_fallback`
- 驗證站內分類 id 有效
- 驗證層級關係合法（L1->L2、L2->L3）

## 導入與上架流程

### 導入

- 每件商品儲存來源分類資訊（若 DOSO payload 提供）
  - `source_category_id`
  - `source_category_name`（可選，純顯示）

### 上架

分類決策順序：

1. 若商品有 `source_category_id` 且映射存在 -> 用來源分類映射（先查 `directory_url::source_category_id`，再查舊 key）
2. 否則用目錄 fallback 映射
3. 若仍無映射 -> 該商品標記失敗 `missing_category_mapping`

實作上在 client 和 server 都會套用同一決策順序，避免前端繞過導致上錯分類。

## 管理後台 UI

在 `CrawlerImport` 新增「DOSO 來源分類映射」區塊：

- 顯示來源分類樹（可篩選目錄）
- 每個來源分類可選對應 L2/L3
- 顯示映射覆蓋率（已映射/總來源分類）
- 一鍵儲存映射
- 顯示 fallback 設定（每目錄一組）

## 錯誤處理

- `missing_source_category`: 商品無來源分類
- `missing_category_mapping`: 無映射且無 fallback
- `invalid_category_mapping`: 映射到不存在分類
- `invalid_category_mapping_hierarchy`: 映射分類層級不合法

## 操作與排錯

1. 先在後台按「同步來源分類」，確認有抓到來源分類總數。
2. 設定 `L1 日本`、來源分類映射、目錄 fallback，按「儲存映射」。
3. 單筆或批量上架時若出現 `missing_category_mapping`：
   - 檢查該商品是否有 `source_category_id`、`source_directory_url`
   - 檢查 `directory_url::source_category_id` 是否已設定
   - 若來源分類缺失，確認該目錄 fallback 是否已設定

## 驗收標準

1. 可成功拉取 DOSO 來源分類樹並顯示於後台。
2. 可維護來源分類 ID -> 站內分類映射。
3. 上架時會自動套用來源分類映射，無需人工逐件選分類。
4. 對無來源分類商品，可使用目錄 fallback 成功上架。
5. 缺映射時有明確失敗原因，不會上錯分類。

## 非目標

- 本階段不做 AI 分類推薦。
- 本階段不做跨來源平台通用映射框架。
