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
