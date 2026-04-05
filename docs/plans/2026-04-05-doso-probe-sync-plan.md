# DOSO Probe Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在管理員後台讓管理者輸入 DOSO 帳密後，執行一次性 Probe，驗證 9 個目錄的商品列表與商品詳情可抓取性，並回傳結構化報告（不寫入商品資料庫、不儲存帳密）。

**Architecture:** 前端在 `CrawlerImport` 新增 DOSO Probe 區塊，將帳密與目錄清單送到新的 admin API。後端 API 先做 admin 身分驗證，再啟動 Node runtime 的 browser probe worker（Playwright）於同一 context 中登入 DOSO、巡檢目錄、抽樣進入詳情頁，最後回傳報告 JSON。資料只存在 request 記憶體，結束即釋放 browser context。

**Tech Stack:** Next.js App Router Route Handlers、TypeScript、Supabase Auth (現有 admin 驗證模式)、Playwright（browser context probe）、既有 Admin UI (`CrawlerImport`)。

---

### Task 1: 建立 DOSO Probe 型別與常數

**Files:**
- Create: `src/lib/doso/types.ts`
- Create: `src/lib/doso/targets.ts`

**Step 1: 先寫最小型別（先讓 compiler fail）**

```ts
export interface DosoProbeRequest {
  username: string;
  password: string;
  targets: string[];
}
```

**Step 2: 補完整回傳型別與 target 常數**

```ts
export interface DosoProbeTargetResult {
  url: string;
  title: string;
  list_ok: boolean;
  list_count_page: number;
  samples: Array<{
    id: string;
    title: string;
    price_twd?: number | null;
    price_jpy?: number | null;
    detail_url?: string | null;
  }>;
  detail_ok: boolean;
  detail_fields_presence: {
    title: boolean;
    price: boolean;
    images: boolean;
    description: boolean;
    specs: boolean;
  };
  error?: string;
}
```

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/lib/doso/types.ts src/lib/doso/targets.ts
git commit -m "新增 DOSO probe 型別與目錄常數"
```

### Task 2: 建立 admin API 共用驗證 helper

**Files:**
- Create: `src/lib/adminAuth.ts`
- Modify: `src/app/api/admin/members/route.ts`

**Step 1: 抽出 admin 驗證 helper（先讓舊檔 import fail）**

```ts
export async function requireAdmin(request: NextRequest): Promise<{ ok: true; userId: string } | { ok: false; status: number; error: string }> {
  // 驗證 Bearer token + profiles.is_admin
}
```

**Step 2: 在既有 admin route 套用 helper（驗證不破壞原行為）**

```ts
const auth = await requireAdmin(request);
if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
```

**Step 3: Run lint + type check**

Run: `npm run lint && npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/lib/adminAuth.ts src/app/api/admin/members/route.ts
git commit -m "抽出管理員 API 共用驗證 helper"
```

### Task 3: 實作 DOSO browser probe service

**Files:**
- Create: `src/lib/doso/probeService.ts`

**Step 1: 先實作最小可跑流程（登入 + 單一目錄）**

```ts
export async function runDosoProbe(input: DosoProbeRequest): Promise<DosoProbeResponse> {
  // 1) launch browser
  // 2) login
  // 3) open first target
  // 4) return minimal result
}
```

**Step 2: 擴充到 9 目錄巡檢 + 抽樣詳情**

```ts
// 每個 target:
// - 讀取列表項目數
// - 抽前 3 筆
// - 各取 1 筆進詳情，判斷欄位存在
```

**Step 3: 加上安全與穩定措施**

```ts
// - 不寫 console 密碼
// - try/finally 關閉 browser
// - 每個 target 獨立 try/catch，避免全體失敗
// - timeout 控制
```

**Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/doso/probeService.ts
git commit -m "新增 DOSO browser probe 服務"
```

### Task 4: 新增 Probe API Route（管理員後台使用）

**Files:**
- Create: `src/app/api/admin/sync/doso/probe/route.ts`

**Step 1: 寫 request 驗證（先做 fail-fast）**

```ts
if (!body.username || !body.password) {
  return NextResponse.json({ error: "缺少 DOSO 帳密" }, { status: 400 });
}
```

**Step 2: 串接 `requireAdmin` + `runDosoProbe`**

```ts
const auth = await requireAdmin(request);
if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

const report = await runDosoProbe(body);
return NextResponse.json(report);
```

**Step 3: 設定 Node runtime，避免 edge 限制**

```ts
export const runtime = "nodejs";
```

**Step 4: 手動驗證未登入/非 admin/成功路徑**

Run:
- `curl -X POST http://localhost:3003/api/admin/sync/doso/probe -H 'Content-Type: application/json' -d '{}'`
- 前端 admin 頁面以登入狀態測一次

Expected:
- 無 token: 401
- 非 admin: 403
- admin + 正確帳密: 200 並回傳 target 報告

**Step 5: Commit**

```bash
git add src/app/api/admin/sync/doso/probe/route.ts
git commit -m "新增 DOSO probe 管理端 API"
```

### Task 5: 在 CrawlerImport 新增 DOSO Probe 表單與結果面板

**Files:**
- Modify: `src/components/admin/CrawlerImport.tsx`

**Step 1: 新增 state 與提交函式（先讓 UI 可送 request）**

```ts
const [dosoUsername, setDosoUsername] = useState("");
const [dosoPassword, setDosoPassword] = useState("");
const [probeLoading, setProbeLoading] = useState(false);
const [probeResult, setProbeResult] = useState<DosoProbeResponse | null>(null);
```

**Step 2: 新增 UI 區塊（帳密 + 探測按鈕）**

```tsx
<input type="text" value={dosoUsername} ... />
<input type="password" value={dosoPassword} ... />
<button onClick={handleDosoProbe}>探測目錄</button>
```

**Step 3: 新增結果表格（每個 target 一列）**

```tsx
// 欄位：URL, list_ok, list_count_page, detail_ok, samples
```

**Step 4: 安全處理**

```ts
// 成功或失敗後清空密碼
setDosoPassword("");
```

**Step 5: Run lint + type check**

Run: `npm run lint && npx tsc --noEmit`
Expected: PASS

**Step 6: Commit**

```bash
git add src/components/admin/CrawlerImport.tsx
git commit -m "後台新增 DOSO 帳密探測流程"
```

### Task 6: 加入相依與執行環境備註

**Files:**
- Modify: `package.json`
- Modify: `doc/問題描述.md`

**Step 1: 新增 probe 需要的依賴**

```json
{
  "dependencies": {
    "playwright": "^1.59.1"
  }
}
```

**Step 2: 文件補充操作注意事項**

```md
- DOSO Probe 為一次性帳密登入，不保存帳密
- 首次部署需安裝 Playwright browser binary
- 失敗時先檢查 DOSO 是否改版或需額外驗證
```

**Step 3: 安裝與驗證**

Run: `npm install && npx playwright install chromium`
Expected: 安裝完成

**Step 4: Commit**

```bash
git add package.json package-lock.json doc/問題描述.md
git commit -m "補齊 DOSO probe 執行依賴與文件"
```

### Task 7: 端到端驗證（不寫入產品資料）

**Files:**
- Modify: `doc/問題描述.md`

**Step 1: 跑 admin UI 手測清單**

Run:
1. 開啟 `/admin` > 爬蟲導入
2. 輸入 DOSO 帳密
3. 點「探測目錄」

Expected:
- 9 個目錄都有結果
- 至少可看到每目錄 1-3 筆 sample
- 詳情欄位 presence 有值（true/false）

**Step 2: API 手測（可重現）**

Run:

```bash
curl -X POST http://localhost:3003/api/admin/sync/doso/probe \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"username":"<u>","password":"<p>","targets":[]}'
```

Expected: 回 200 JSON，且包含 `targets` 陣列

**Step 3: 補驗證紀錄文件**

```md
## DOSO Probe 驗證
- 日期
- 測試帳號（遮蔽）
- 成功目錄數/失敗目錄數
- 失敗原因摘要
```

**Step 4: Commit**

```bash
git add doc/問題描述.md
git commit -m "補上 DOSO probe 驗證記錄"
```

### Task 8: 為正式同步階段預留介面（不實作寫庫）

**Files:**
- Create: `src/lib/doso/normalize.ts`
- Modify: `src/lib/doso/types.ts`

**Step 1: 定義 normalize 後的商品 DTO**

```ts
export interface NormalizedDosoProduct {
  source: "doso";
  source_catalog: string;
  source_product_id: string;
  title: string;
  description: string;
  price_jpy?: number | null;
  price_twd?: number | null;
  image_urls: string[];
  detail_url: string;
}
```

**Step 2: 實作最小 normalize function（僅轉型，不寫資料庫）**

```ts
export function normalizeProbeSamples(...) {
  // 先只轉 probe sample -> NormalizedDosoProduct[]
}
```

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/lib/doso/normalize.ts src/lib/doso/types.ts
git commit -m "預留 DOSO 正式同步用 normalize 介面"
```

---

## Done Criteria

- 管理員可在後台輸入 DOSO 帳密，成功觸發 probe。
- probe 不保存帳密，不輸出敏感資訊。
- 9 個目錄都有結構化報告（list/detail 可用性與樣本）。
- 全程不寫入 products 等商品資料表。
- `npm run lint` 與 `npx tsc --noEmit` 通過。

## Verification Commands (final gate)

```bash
npm run lint
npx tsc --noEmit
```
