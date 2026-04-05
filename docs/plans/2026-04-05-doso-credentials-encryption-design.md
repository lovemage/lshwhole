# DOSO 帳密儲存與加密設計

日期: 2026-04-05
狀態: 已核准
範圍: 管理後台 DOSO 導入流程

## 目標

- DOSO 導入帳密改為可儲存，不需每次重打。
- 密碼必須以加密方式儲存，前端不可取得明文。
- UI 提供「使用方式」連結，點擊彈窗顯示操作指引。

## 需求決策

- 帳密作用域: 全站共用一組（admin 維護）。
- 加密方案: 伺服器端 AES-256-GCM。
- 密碼管理: 僅寫入時接受明文，讀取時回傳 `has_password`，不回明文。

## 方案比較

1. DB 加密儲存（採用）
   - 優點: 符合「可儲存」、跨裝置可用、具備後台管理性。
   - 缺點: 需管理加密金鑰。
2. 僅環境變數
   - 優點: 最簡單安全。
   - 缺點: 無法在 UI 動態更新，不符需求。
3. 前端 localStorage
   - 優點: 實作快。
   - 缺點: 安全風險高，不採用。

## 資料模型

沿用 `system_settings`，新增 key:

- `key`: `doso_credentials_v1`
- `value` (json):
  - `username`: string
  - `password_encrypted`: string (base64)
  - `iv`: string (base64)
  - `tag`: string (base64)
  - `updated_at`: string (ISO)

備註:

- 不新增獨立表，減少 migration 風險與維護成本。

## API 設計

### 1) 讀取已儲存帳密狀態

`GET /api/admin/sync/doso/credentials`

回傳:

```json
{
  "ok": true,
  "username": "示例帳號",
  "has_password": true
}
```

### 2) 儲存帳密

`PUT /api/admin/sync/doso/credentials`

請求:

```json
{
  "username": "示例帳號",
  "password": "示例密碼"
}
```

規則:

- `username` 可更新。
- `password` 若有提供則加密覆寫。
- `password` 若空字串或未提供，代表不變更密碼。

回傳:

```json
{
  "ok": true,
  "username": "示例帳號",
  "has_password": true
}
```

### 3) 導入 API 帳密來源優先順序

套用至:

- `POST /api/admin/sync/doso/import/start`
- `POST /api/admin/sync/doso/probe`

優先順序:

1. 本次請求明確傳入帳密 -> 使用本次帳密。
2. 否則讀取已儲存帳密並解密使用。
3. 若都沒有 -> 回 400，提示先儲存或輸入帳密。

## 加解密設計

- 演算法: AES-256-GCM
- 金鑰來源: 環境變數 `DOSO_CREDENTIALS_ENCRYPTION_KEY`
- IV: 每次加密隨機產生
- 儲存格式: `password_encrypted` + `iv` + `tag` (base64)

錯誤策略:

- 若環境變數缺失，儲存 API 回 500（固定錯誤碼，例如 `missing_encryption_key`）。
- 解密失敗回 500（固定錯誤碼，例如 `decrypt_failed`），避免洩漏細節。

## 前端 UI 設計

檔案: `src/components/admin/CrawlerImport.tsx`

### 帳密區塊

- 帳號欄位：可編輯。
- 密碼欄位：留空表示不更新；若已儲存則顯示「已儲存密碼」。
- 按鈕：`儲存帳密`。

### 使用方式連結 + 彈窗

- 在 DOSO 區塊標題旁新增 `使用方式` 連結。
- 點擊打開 Modal，內容包含：
  1) 先儲存帳密
  2) 選擇目錄
  3) 開始導入建立 session
  4) 繼續導入下一批
  5) 觀察進度欄位
  6) 中斷後可續傳
- 底部按鈕：`我知道了`。
- 可選: 使用 `localStorage` 記錄看過指引，降低重複干擾。

## 權限與安全

- 僅 admin 可讀寫帳密設定。
- API 不回傳明文密碼。
- 前端不做密碼本地持久化。
- 錯誤訊息對外簡化，不回傳敏感堆疊訊息。

## 驗收標準

1. 能在後台儲存 DOSO 帳號與加密密碼。
2. 重新整理後可看到 `username` 與 `has_password=true`，但無密碼明文。
3. 導入時可不輸入帳密，系統自動使用已儲存帳密。
4. 「使用方式」連結可開啟彈窗並顯示完整操作流程。
5. 缺少加密金鑰時，API 回可判斷的錯誤碼，不可靜默失敗。

## 非目標

- 本次不做每位管理員各自帳密。
- 本次不做密碼版本歷史與審計追蹤。
