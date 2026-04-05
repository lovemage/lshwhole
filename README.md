# Lsx Wholesale - 前端應用

這是 Lsx Wholesale 批發電商平台的 Next.js 前端應用。

## 快速開始

### 安裝依賴
\\\ash
npm install
\\\

### 配置環境變數
在 \web\ 目錄建立 \.env.local\ 文件：
\\\nv
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ADMIN_JWT_SECRET=your_admin_jwt_secret
\\\

### 啟動開發伺服器
\\\ash
npm run dev
\\\

伺服器將在 \http://localhost:3000\ 啟動

## 常用命令

| 命令 | 說明 |
|------|------|
| \
pm run dev\ | 啟動開發伺服器 |
| \
pm run build\ | 構建生產版本 |
| \
pm start\ | 運行生產版本 |
| \
pm run type-check\ | TypeScript 類型檢查 |

## 頁面導航

| 頁面 | URL |
|------|-----|
| 首頁 | http://localhost:3000 |
| 產品列表 | http://localhost:3000/products |
| 產品詳情 | http://localhost:3000/products/1 |
| 購物車 | http://localhost:3000/cart |
| 結帳 | http://localhost:3000/checkout |
| 登入 | http://localhost:3000/login |
| 註冊 | http://localhost:3000/register |
| 後台管理 | http://localhost:3000/admin |

## 技術棧

- **框架**：Next.js 14 (App Router)
- **語言**：TypeScript
- **樣式**：Tailwind CSS v4
- **後端**：Supabase (Postgres + Auth)
- **部署**：Vercel

## 完整文檔

請查看根目錄的 \README.md\ 獲取完整的項目文檔。

## Railway 部署（方案 A：保留 Supabase + Resend）

此方案僅將 Next.js 應用部署到 Railway，資料庫/認證仍使用 Supabase，Email 仍使用 Resend。

1. 在 Railway 建立新專案並連接此 GitHub repo。
2. Railway 會使用 `railway.json` + Nixpacks 建置，啟動指令為 `npm run start`。
3. 在 Railway Variables 填入 `railway.env.example` 內的環境變數。
4. 將 `NEXT_PUBLIC_APP_URL` 與 `APP_URL` 設為 Railway 的公開網域（例如 `https://xxx.up.railway.app`）。
5. 重新部署後，檢查 `/`、`/login`、`/api/test-db`。

注意：本方案不會搬移資料，也不改寫 Supabase 程式碼。
