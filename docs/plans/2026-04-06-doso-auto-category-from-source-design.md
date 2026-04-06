# DOSO 導入商品自動來源分類設計

## 背景

目前導入 DOSO 商品後，`/api/publish-product` 在缺少有效分類映射時會回傳 `missing_category_mapping`，導致「導入後直接上架」流程中斷。使用者希望改為：只要商品帶有來源分類資訊，就自動依來源網站分類建立本地分類並完成上架，不再依賴手動指定 L1/L2/L3。

## 目標

- 導入後可直接上架，不需手動選 L1/L2/L3。
- 若商品有來源分類資訊，優先以來源分類自動建立對應本地分類。
- 自動建立分類固定掛在既有「日本 L1」下。

## 非目標

- 不變更既有 DOSO 來源目錄設定方式。
- 不新增新的上架 API。
- 不調整既有資料表結構。

## 設計原則

- 後端單點決策：分類解析與建立邏輯集中在 `/api/publish-product`。
- 向後相容：若來源分類不足，仍可退回既有 `category_ids` 流程。
- 錯誤可觀測：回傳明確錯誤碼與訊息，方便前端顯示。

## 核心流程

1. 前端送出上架 payload，補齊 `source_directory_url`、`source_category_id`、`source_category_name`（可得時）。
2. 後端收到請求後：
   - 優先嘗試 `resolveOrCreateCategoryByDosoSource`。
   - 若成功，直接使用自動解析出的 `resolvedCategoryIds`。
   - 若失敗，再嘗試既有映射 `resolveMappedCategoryBySourceCategoryId` 與 `resolveDirectoryFallbackCategory`。
   - 全部失敗且無手動 `category_ids` 時，回傳 `missing_category_mapping`。
3. 後續 upsert 商品、重建關聯資料流程不變。

## 風險與對策

- 來源分類名稱缺失：前端補送 `source_category_name`，後端保留既有 fallback。
- 分類節點不存在於快取：以來源名稱建立 ad-hoc L2，避免流程中斷。
- 日本 L1 未設定：維持明確失敗（避免錯誤掛載到未知 L1）。

## 驗證

- 導入單筆商品，未手動選 L1/L2/L3，可成功上架並建立分類關聯。
- 導入批量商品，含不同來源分類，可成功建立對應 L2/L3 並上架。
- 缺少來源分類且無 `category_ids` 時，仍應得到 `missing_category_mapping`。
