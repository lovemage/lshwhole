# Kids Village Admin Crawler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Kids Village as an admin crawler import source with encrypted admin-entered credentials, verified login/detail scraping, source category sync, and a collapsible credentials UI.

**Architecture:** Extend the existing DOSO/Toybox import pipeline instead of creating a separate crawler flow. Add a source registry so source detection, allowed target URLs, credentials, and UI labels are data-driven rather than scattered hardcoded checks. Kids Village will support both category URLs and brand URLs, but source-category mapping should use category (`/shop/list.php?ca_id=...`) as the primary taxonomy because brands are vendor dimensions and the left-side category tree maps better to LSH product categories.

**Tech Stack:** Next.js App Router, TypeScript, React, existing Playwright crawler service in `src/lib/doso/probeService.ts`, Supabase `system_settings`, `agent-browser` for website verification, ESLint, `npx tsc --noEmit`.

---

## Agent-Browser Findings

- Login page: `https://www.kidsvillage.co.kr/bbs/login.php?url=%2Fshop%2Fbrand.php`.
- Login form action: `https://www.kidsvillage.co.kr/bbs/login_check.php`, method `post`.
- Login fields: `input[name="mb_id"]` and `input[name="mb_password"]`; hidden return URL field is `input[name="url"]`.
- Brand index: `https://www.kidsvillage.co.kr/shop/brand.php`.
- Brand links use `https://www.kidsvillage.co.kr/shop/brand.php?sort_id=&br_id=418` style URLs.
- Category links use `https://www.kidsvillage.co.kr/shop/list.php?ca_id=10` and nested IDs such as `1010`, `a010`, `d040`.
- Product links use `https://www.kidsvillage.co.kr/shop/item.php?it_id=2C1777262389`.
- Unauthenticated product detail redirects to `https://www.kidsvillage.co.kr/bbs/register.php`, so detail field verification must be performed after real Kids Village credentials are saved in admin.
- Recommendation: default sync/mapping by category. Allow brand URL paste for vendor-specific imports, but do not use brand as the category mapping source unless the product page has no category breadcrumb.

## Mandatory Pre-Implementation Mapping Gate

Do not implement Kids Village scraping code until this gate is completed with real logged-in page evidence. Public pages are not enough because wholesale price and detail content are hidden behind login, and unauthenticated product detail redirects to `/bbs/register.php`.

Required evidence before coding:

- Log in to Kids Village with a real account using `agent-browser` or an imported authenticated browser state.
- Open at least 3 product detail pages from different list contexts:
- Category list sample: `https://www.kidsvillage.co.kr/shop/list.php?ca_id=10` or another real category.
- Brand list sample: `https://www.kidsvillage.co.kr/shop/brand.php?sort_id=&br_id=418` or another real brand.
- Default brand index sample: `https://www.kidsvillage.co.kr/shop/brand.php`.
- For every sampled product, record the exact DOM source for each target field:
- `productCode`: exact `it_id` extraction source from URL or DOM.
- `title`: exact selector and visible Korean text.
- `brand`: exact selector and visible Korean text if present.
- `sourceCategoryId`: exact breadcrumb/category selector or list-context fallback.
- `sourceCategoryName`: exact breadcrumb/category text or list-context fallback.
- `wholesalePriceKRW`: exact selector/text and whether it is wholesale, sale, retail, option, or member-only price.
- `images`: exact selector list and how product images are separated from logo/banner/icon images.
- `description`: exact selector and whether the content is text, HTML, image-only, or mixed.
- `options/specs`: exact selector and option price adjustment behavior if present.
- `soldOut/stock`: exact selector or absence.
- Confirm list-page card fields separately from detail-page fields:
- Product card URL selector.
- Product card title selector.
- Product card brand selector.
- Product card image selector.
- Product card price visibility before and after login.
- Decide source mapping only after evidence:
- Use category when product detail breadcrumb or list context provides category.
- Use brand only as vendor metadata and as a fallback `sourceCategoryId` when no category is available.
- Do not map wholesale price, description, or images using fallback selectors until the exact logged-in DOM has been verified.

Evidence output must be appended to this plan under `Verified Kids Village Field Map` before Task 1 starts. If any field is ambiguous, stop and ask for a product URL/account state rather than guessing.

## Verified Kids Village Field Map

Status: verified with logged-in `agent-browser` session on 2026-04-27. Do not replace these selectors with broad fallbacks unless a new logged-in check proves the DOM changed.

Verified samples:

- Category list: `https://www.kidsvillage.co.kr/shop/list.php?ca_id=10`
- Category detail: `https://www.kidsvillage.co.kr/shop/item.php?it_id=9C1777262389&ca_id=10`
- Brand list: `https://www.kidsvillage.co.kr/shop/brand.php?sort_id=6&br_id=194`
- Brand detail: `https://www.kidsvillage.co.kr/shop/item.php?it_id=2C1777262389&sort_id=6&br_id=194`
- Default brand index detail: `https://www.kidsvillage.co.kr/shop/item.php?it_id=2C1777262389`

List page verified selectors:

| Field | Verified Selector / Source | Sample Value | Notes |
| --- | --- | --- | --- |
| product card | `[id^="cart_good_zone_"]` | `cart_good_zone_9C1777262389` | ID embeds `it_id`; use it as card scope. |
| product URL | `[id^="cart_good_zone_"] a.sct_a[href*="/shop/item.php?it_id="]` | `/shop/item.php?it_id=9C1777262389&ca_id=10` | On category pages includes `ca_id`; on brand pages includes `br_id` when filtered; default brand index may only include `it_id`. |
| card image | `[id^="cart_good_zone_"] .sct_img img[src*="/data/item/"]` | `.../thumbva2-1_9_911777262389_370x370.jpg` | Excludes season icon and empty cart image. |
| card title | `[id^="cart_good_zone_"] .Bottom_Box a[href*="/shop/item.php?it_id="]` with non-empty text | `매직스텝티추가` | Image `alt` matches title but link text is the cleaner source. |
| card brand | `[id^="cart_good_zone_"] .Top_Box li:first-child a[href*="/shop/brand.php"]` | `몽베베` | Brand href contains `br_id`, e.g. `br_id=194`. |
| card price | `[id^="cart_good_zone_"] .Top_Box li:nth-child(2)` | `15,000원` | This matches logged-in supply price, not retail. |
| card options | `[id^="cart_good_zone_"] .Center_Box` rows | `색상 아이/연베이지`, `사이즈 S...` | Use for preview only; detail page select options are authoritative. |
| list source category | current target URL `ca_id` on `/shop/list.php` | `10` | Category page source ID must come from list context, not detail DOM. |
| list source brand | `.Top_Box li:first-child a[href*="br_id="]` or current brand URL | `br_id=194`, `몽베베` | Brand is vendor metadata and fallback source only. |

Detail page verified selectors:

| Field | Verified Selector / Source | Sample Value | Notes |
| --- | --- | --- | --- |
| productCode | URL search param `it_id`; hidden input `input[name="it_id[]"]` also exists | `9C1777262389`, `2C1777262389` | Use URL `it_id` as primary. Stored product code should be `kidsvillage-${it_id}`. |
| title | `#sit_title` | `매직스텝티추가`, `26멀티밤셋업상하모자세트추가` | Do not use document title except as fallback for category text. |
| brand | `#sit_ov .sit_ov_tbl tr` where `th` text is `브랜드`, then `td` | `몽베베` | Detail page has brand text but no brand URL. Preserve `br_id` from list card when available. |
| sourceCategoryId | List context URL `ca_id` when present; no stable detail DOM category ID found | `kidsvillage:category:10` from category list | Detail page title shows category name, but not `ca_id`. Do not invent category ID from title. |
| sourceCategoryName | Category list context name, or document title category segment after `>` only as name fallback | `상의` from list context; `수영복` from detail title fallback | For brand/default list, source category ID is unavailable unless original list card URL has `ca_id`. |
| wholesalePriceKRW | `#it_price.value`; display row: `#sit_ov .sit_ov_tbl tr` where `th` is `공급가격` | `15000`, display `15,000원`; `47000`, display `47,000원` | Confirmed logged-in supply price. Consumer price is separate row `소비자가격` and must not be imported as wholesale. |
| retail/reference price | `#sit_ov .sit_ov_tbl tr` where `th` is `소비자가격` | `24,000원 (공급가의 1.6배)`, `75,200원 (공급가의 1.6배)` | Store only if needed as reference; current import product type primarily needs wholesale cost. |
| main images | `#sit_pvi img[src*="/data/item/"]` | `.../thumbva2-1_2_3661777262389_600x600.jpg` | Main carousel images. Deduplicate because carousel may clone slides in Owl Carousel. |
| description images | `#sit_inf_explan img[src*="/data/item/"]` | `.../data/item/2C1777262389/1_2_3661777262389.jpg` | Description is image-only in verified samples. Preserve image URLs in description HTML or append to images depending publish behavior. |
| description text | `#sit_inf_explan.innerText` | empty except spacing in verified samples | Description content is image-based, not text-based. Do not expect Korean paragraph text. |
| options/specs | `#sit_ov select#it_option_1`, `#sit_ov select#it_option_2`; labels from `label[for="it_option_1"]` / `label[for="it_option_2"]` | 색상: `아이`, `연베이지`; 사이즈: `S(1-2세)`, `M(3-4세)` | After selecting color, size options become enabled and show `+ 0원`. No positive option price adjustment observed in sampled items. |
| release date | `#sit_ov .sit_ov_tbl tr` where `th` is `제조일자` | `2026-04-27` | Optional metadata. |
| season | same `제조일자` row, `td.View_Season_Box` | `여름` | Optional metadata. |
| soldOut/stock | Not present in sampled detail DOM | none | Do not import stock quantity unless future verified sample exposes it. |

Mapping decision after verification:

- Category sync/import should use list context `ca_id` for `sourceCategoryId` when syncing `/shop/list.php?...` pages.
- Brand sync/import should store brand as vendor metadata (`brandName`, `brandId`) and only use `kidsvillage:brand:${br_id}` as source fallback when no `ca_id` is available.
- Detail-only URLs without `ca_id` or `br_id` cannot produce a verified source category ID. They can produce title, brand, price, images, options, and category name fallback from document title, but not category ID.
- Price import must use `#it_price.value` or the `공급가격` row. Never use `소비자가격` for wholesale price.

## File Structure

- Modify: `src/lib/doso/targets.ts`
  - Add source-aware target metadata and Kids Village options.
- Modify: `src/lib/doso/credentialStore.ts`
  - Add `kidsvillage` credential key and preserve encrypted storage behavior.
- Modify: `src/app/api/admin/sync/doso/credentials/route.ts`
  - Parse `kidsvillage` as a valid credential source and return source-specific labels.
- Modify: `src/app/api/admin/sync/doso/import/start/route.ts`
  - Resolve credentials and target allowlist through source metadata instead of Toybox-only hostname logic.
- Modify: `src/lib/doso/probeService.ts`
  - Add Kids Village login, list collection, detail scraping, import preview, and source category extraction.
- Modify: `src/lib/doso/sourceCategoryStore.ts`
  - Accept Kids Village target URLs in source category cache and fallback mapping.
- Modify: `src/lib/doso/types.ts`
  - Add optional source fields only where needed for UI/API clarity.
- Modify: `src/components/admin/CrawlerImport.tsx`
  - Replace hardcoded DOSO/Toybox credential blocks with a collapsible source credentials panel and add Kids Village target behavior.
- Optional create: `src/lib/doso/sourceRegistry.ts`
  - If keeping source metadata in `targets.ts` makes the file too crowded, move reusable source helpers here.

---

### Task 1: Add Source Metadata And Kids Village Targets

**Files:**
- Modify: `src/lib/doso/targets.ts`

- [ ] **Step 1: Write the failing type usage**

Temporarily add this usage in `src/lib/doso/targets.ts` while implementing:

```ts
const _kidsVillageSourceCheck: DosoCredentialSource = "kidsvillage";
```

Expected before implementation: TypeScript fails because `DosoCredentialSource` is not defined.

- [ ] **Step 2: Run type check to verify it fails**

Run: `npx tsc --noEmit`

Expected: TypeScript error for missing source type.

- [ ] **Step 3: Implement source-aware target metadata**

Replace `targets.ts` with source metadata that preserves existing exports:

```ts
export type DosoCredentialSource = "doso" | "toybox" | "kidsvillage";

export interface DosoTargetOption {
  url: string;
  label: string;
  source: DosoCredentialSource;
  manualUrlPlaceholder?: string;
  manualUrlHelp?: string;
}

export interface DosoSourceOption {
  source: DosoCredentialSource;
  label: string;
  usernamePlaceholder: string;
  loginUrl: string;
}

export const DOSO_SOURCE_OPTIONS: DosoSourceOption[] = [
  {
    source: "doso",
    label: "DOSO",
    usernamePlaceholder: "例如：陳奕如",
    loginUrl: "https://www.doso.net/auth/login",
  },
  {
    source: "toybox",
    label: "Toybox",
    usernamePlaceholder: "例如：joytoy",
    loginUrl: "https://www.toybox.kr/shop/member.html?type=login",
  },
  {
    source: "kidsvillage",
    label: "Kids Village",
    usernamePlaceholder: "Kids Village 帳號",
    loginUrl: "https://www.kidsvillage.co.kr/bbs/login.php?url=%2Fshop%2Fbrand.php",
  },
];

export const DEFAULT_DOSO_TARGETS = [
  "https://www.doso.net/onlineMall/selfOperatedMall",
  "https://www.doso.net/onlineMall/PreSelfOperatedMall",
  "https://www.doso.net/onlineMall/etonet",
  "https://www.doso.net/onlineMall/etonetRanking",
  "https://www.doso.net/onlineMall/tanbaya",
  "https://www.doso.net/onlineMall/dabandaxi",
  "https://www.doso.net/onlineMall/dabansinei",
  "https://www.doso.net/onlineMall/shineiRanking",
  "https://www.doso.net/onlineMall/gomen",
  "https://www.toybox.kr/",
  "https://www.kidsvillage.co.kr/shop/list.php",
];

export const DOSO_TARGET_OPTIONS: DosoTargetOption[] = [
  { url: "https://www.doso.net/onlineMall/selfOperatedMall", label: "批發商城", source: "doso" },
  { url: "https://www.doso.net/onlineMall/PreSelfOperatedMall", label: "批發目錄預購", source: "doso" },
  { url: "https://www.doso.net/onlineMall/etonet", label: "海渡", source: "doso" },
  { url: "https://www.doso.net/onlineMall/etonetRanking", label: "海渡熱賣", source: "doso" },
  { url: "https://www.doso.net/onlineMall/tanbaya", label: "丹波屋", source: "doso" },
  { url: "https://www.doso.net/onlineMall/dabandaxi", label: "大西", source: "doso" },
  { url: "https://www.doso.net/onlineMall/dabansinei", label: "寺內", source: "doso" },
  { url: "https://www.doso.net/onlineMall/shineiRanking", label: "寺內熱賣", source: "doso" },
  { url: "https://www.doso.net/onlineMall/gomen", label: "江錦", source: "doso" },
  {
    url: "https://www.toybox.kr/",
    label: "Toybox",
    source: "toybox",
    manualUrlPlaceholder: "https://www.toybox.kr/shop/shopbrand.html?xcode=...",
    manualUrlHelp: "可直接貼上 Toybox 品牌/分類網址。",
  },
  {
    url: "https://www.kidsvillage.co.kr/shop/list.php",
    label: "Kids Village 分類",
    source: "kidsvillage",
    manualUrlPlaceholder: "https://www.kidsvillage.co.kr/shop/list.php?ca_id=10",
    manualUrlHelp: "建議使用分類網址同步，分類較適合對應站內 L2/L3。",
  },
  {
    url: "https://www.kidsvillage.co.kr/shop/brand.php",
    label: "Kids Village 品牌",
    source: "kidsvillage",
    manualUrlPlaceholder: "https://www.kidsvillage.co.kr/shop/brand.php?sort_id=&br_id=418",
    manualUrlHelp: "品牌適合指定廠商補抓；分類對應仍以商品分類優先。",
  },
];

export const getSourceByTargetUrl = (value: string): DosoCredentialSource | null => {
  try {
    const input = new URL(value);
    const matched = DOSO_TARGET_OPTIONS.find((option) => {
      const allowed = new URL(option.url);
      const allowedPath = allowed.pathname.replace(/\/$/, "");
      const inputPath = input.pathname.replace(/\/$/, "");
      if (input.hostname !== allowed.hostname) return false;
      if (!allowedPath) return true;
      return inputPath.startsWith(allowedPath);
    });
    return matched?.source || null;
  } catch {
    return null;
  }
};

export const getTargetOptionByUrl = (value?: string | null) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const input = new URL(raw);
    return DOSO_TARGET_OPTIONS.find((option) => {
      const allowed = new URL(option.url);
      const allowedPath = allowed.pathname.replace(/\/$/, "");
      const inputPath = input.pathname.replace(/\/$/, "");
      if (input.hostname !== allowed.hostname) return false;
      if (!allowedPath) return true;
      return inputPath.startsWith(allowedPath);
    }) || null;
  } catch {
    return null;
  }
};
```

Remove the temporary `_kidsVillageSourceCheck` before committing.

- [ ] **Step 4: Run verification**

Run: `npx tsc --noEmit`

Expected: no errors from `targets.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/doso/targets.ts
git commit -m "新增Kids Village同步來源設定"
```

---

### Task 2: Add Kids Village Credential Storage

**Files:**
- Modify: `src/lib/doso/credentialStore.ts`
- Modify: `src/app/api/admin/sync/doso/credentials/route.ts`

- [ ] **Step 1: Write failing route check**

Run against dev server after logging in as admin:

```bash
curl -i "http://localhost:3003/api/admin/sync/doso/credentials?source=kidsvillage" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Expected before implementation: route treats it as DOSO and returns DOSO status.

- [ ] **Step 2: Extend credential sources**

In `credentialStore.ts`, import the source type and update keys:

```ts
import type { DosoCredentialSource } from "@/lib/doso/targets";

const CREDENTIALS_KEYS: Record<DosoCredentialSource, string> = {
  doso: "doso_credentials_v1",
  toybox: "toybox_credentials_v1",
  kidsvillage: "kidsvillage_credentials_v1",
};

export type CredentialSource = DosoCredentialSource;
```

Keep existing `saveCredentials`, `getSavedCredentialStatus`, and `getSavedCredentialsForLogin` behavior unchanged so passwords remain encrypted in `system_settings`.

- [ ] **Step 3: Parse Kids Village in credentials API**

In `credentials/route.ts`, replace `parseCredentialSource` with:

```ts
const CREDENTIAL_LABELS: Record<CredentialSource, string> = {
  doso: "DOSO",
  toybox: "Toybox",
  kidsvillage: "Kids Village",
};

const parseCredentialSource = (request: NextRequest, bodySource?: unknown): CredentialSource => {
  const sourceFromQuery = request.nextUrl.searchParams.get("source");
  const raw = (typeof bodySource === "string" ? bodySource : sourceFromQuery || "doso").toLowerCase();
  if (raw === "toybox" || raw === "kidsvillage") return raw;
  return "doso";
};
```

Update the missing username error:

```ts
{ ok: false, error: `缺少 ${CREDENTIAL_LABELS[source]} 帳號` }
```

- [ ] **Step 4: Run verification**

Run:

```bash
npx tsc --noEmit
npm run lint
```

Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/doso/credentialStore.ts src/app/api/admin/sync/doso/credentials/route.ts
git commit -m "新增Kids Village帳密儲存"
```

---

### Task 3: Implement Kids Village Login And List Scraping

**Files:**
- Modify: `src/lib/doso/probeService.ts`

- [ ] **Step 1: Add source detection helpers**

Add near existing URL helpers:

```ts
const KIDSVILLAGE_LOGIN_URL = "https://www.kidsvillage.co.kr/bbs/login.php?url=%2Fshop%2Fbrand.php";

const isKidsVillageUrl = (value: string) => {
  try {
    const u = new URL(value);
    return u.hostname === "www.kidsvillage.co.kr" || u.hostname === "kidsvillage.co.kr";
  } catch {
    return false;
  }
};
```

- [ ] **Step 2: Implement login**

Add:

```ts
const loginKidsVillage = async (page: any, username: string, password: string) => {
  await page.goto(KIDSVILLAGE_LOGIN_URL, { waitUntil: "networkidle", timeout: 45000 });
  await page.locator('input[name="mb_id"]').first().fill(username);
  await page.locator('input[name="mb_password"]').first().fill(password);
  await Promise.all([
    page.waitForLoadState("networkidle", { timeout: 45000 }).catch(() => null),
    page.locator('input[type="submit"], button[type="submit"]').first().click(),
  ]);
  const currentUrl = page.url();
  const bodyText = await page.locator("body").innerText({ timeout: 10000 }).catch(() => "");
  return !/login\.php|register\.php/.test(currentUrl) && !/로그인\s*실패|회원가입약관/.test(bodyText);
};
```

- [ ] **Step 3: Implement list row collection**

Add `collectKidsVillageListRowsFromCurrentPage`:

```ts
const collectKidsVillageListRowsFromCurrentPage = async (page: any) => {
  return await page.evaluate(() => {
    const clean = (value: string | null | undefined) => String(value || "").replace(/\s+/g, " ").trim();
    const absolute = (href: string | null | undefined) => {
      try {
        return href ? new URL(href, location.href).toString() : null;
      } catch {
        return null;
      }
    };
    const sourceCategoryLink = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/shop/list.php?ca_id="]')).find((a) => a.classList.contains("on"));
    const sourceBrandLink = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/shop/brand.php"][href*="br_id="]')).find((a) => a.classList.contains("on"));
    const sourceCategoryId = sourceCategoryLink ? new URL(sourceCategoryLink.href, location.href).searchParams.get("ca_id") : new URL(location.href).searchParams.get("ca_id");
    const sourceBrandId = sourceBrandLink ? new URL(sourceBrandLink.href, location.href).searchParams.get("br_id") : new URL(location.href).searchParams.get("br_id");
    const sourceName = clean(sourceCategoryLink?.textContent || sourceBrandLink?.textContent || document.querySelector("h2,h3")?.textContent || "Kids Village");
    const seen = new Set<string>();
    return Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/shop/item.php?it_id="]'))
      .map((a) => ({
        title: clean(a.textContent || a.getAttribute("title") || a.querySelector("img")?.getAttribute("alt") || ""),
        detailUrl: absolute(a.getAttribute("href")),
        image: absolute(a.querySelector("img")?.getAttribute("src") || null),
        sourceCategoryId: sourceCategoryId ? `kidsvillage:category:${sourceCategoryId}` : sourceBrandId ? `kidsvillage:brand:${sourceBrandId}` : null,
        sourceCategoryName: sourceName,
      }))
      .filter((row) => row.detailUrl && !seen.has(row.detailUrl) && seen.add(row.detailUrl));
  });
};
```

- [ ] **Step 4: Implement paginated list collection**

Add:

```ts
const collectKidsVillageListRows = async (page: any, targetUrl: string) => {
  const rows: Array<{ title: string; detailUrl: string; image?: string | null; sourceCategoryId?: string | null; sourceCategoryName?: string | null }> = [];
  const visited = new Set<string>();
  let nextUrl: string | null = targetUrl;

  while (nextUrl && rows.length < MAX_IMPORT_ROWS_PER_TARGET) {
    await page.goto(nextUrl, { waitUntil: "networkidle", timeout: 45000 });
    const currentRows = await collectKidsVillageListRowsFromCurrentPage(page);
    for (const row of currentRows) {
      if (!row.detailUrl || visited.has(row.detailUrl)) continue;
      visited.add(row.detailUrl);
      rows.push(row);
    }

    nextUrl = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="page="]'));
      const next = links.find((a) => /다음/.test(a.textContent || ""));
      if (!next?.href) return null;
      return new URL(next.href, location.href).toString();
    });
  }

  return rows;
};
```

If the page returns hundreds of thousands of products, stop at `MAX_IMPORT_ROWS_PER_TARGET` exactly like existing sources.

- [ ] **Step 5: Run verification**

Run: `npx tsc --noEmit`

Expected: type check passes.

- [ ] **Step 6: Commit**

```bash
git add src/lib/doso/probeService.ts
git commit -m "新增Kids Village清單爬取"
```

---

### Task 4: Implement Kids Village Detail Scraping And Import Preview

**Files:**
- Modify: `src/lib/doso/probeService.ts`

- [ ] **Step 1: Add product code extractor**

Add:

```ts
const extractKidsVillageCodeFromUrl = (rawUrl: string, fallback?: string) => {
  try {
    const u = new URL(rawUrl);
    const itId = u.searchParams.get("it_id");
    if (itId) return `kidsvillage-${itId}`;
  } catch {
    // noop
  }
  return fallback || `kidsvillage-${Date.now()}`;
};
```

- [ ] **Step 2: Add detail scraper**

Add:

```ts
const scrapeKidsVillageDetail = async (page: any, detailUrl: string) => {
  await page.goto(detailUrl, { waitUntil: "networkidle", timeout: 45000 });
  const currentUrl = page.url();
  if (/register\.php|login\.php/.test(currentUrl)) {
    throw new Error("Kids Village 商品詳情需要登入後才能讀取");
  }

  return await page.evaluate(() => {
    const clean = (value: string | null | undefined) => String(value || "").replace(/\s+/g, " ").trim();
    const absolute = (value: string | null | undefined) => {
      try {
        return value ? new URL(value, location.href).toString() : null;
      } catch {
        return null;
      }
    };
    const parsePrice = (text: string) => {
      const match = text.replace(/,/g, "").match(/(\d{3,})\s*원/);
      return match ? Number(match[1]) : null;
    };
    const title = clean(document.querySelector("h1,h2,.sit_title,.item-title,.goods_name")?.textContent || document.title.replace(/\|.*$/, ""));
    const bodyText = clean(document.body.textContent || "");
    const price = parsePrice(bodyText);
    const images = Array.from(document.querySelectorAll<HTMLImageElement>('img[src*="/data/item"], img[src*="/data/goods"], #sit_pvi img, .item_detail img'))
      .map((img) => absolute(img.getAttribute("src")))
      .filter((src): src is string => Boolean(src));
    const descriptionRoot = document.querySelector("#sit_inf, #sit_use, .item_detail, .goods_detail, .detail") || document.body;
    const description = clean(descriptionRoot.textContent || "");
    return { title, price_krw: price, images: Array.from(new Set(images)), description };
  });
};
```

Do not use this fallback scraper until `Verified Kids Village Field Map` is completed. Replace broad selectors with the exact logged-in selectors recorded in that section before writing production code. Keep selector list narrow enough to avoid logo/banner images.

- [ ] **Step 3: Add preview functions**

Add `probeSingleKidsVillageTarget` and `runKidsVillageImportPreview` mirroring Toybox behavior only after `Verified Kids Village Field Map` is complete:

```ts
const probeSingleKidsVillageTarget = async (page: any, targetUrl: string): Promise<DosoProbeTargetResult> => {
  try {
    const rows = await collectKidsVillageListRows(page, targetUrl);
    const sampleRows = rows.slice(0, 3);
    let detailFields = { title: false, price: false, images: false, description: false, specs: false };
    if (sampleRows[0]?.detailUrl) {
      const detail = await scrapeKidsVillageDetail(page, sampleRows[0].detailUrl);
      detailFields = {
        title: Boolean(detail.title),
        price: Boolean(detail.price_krw),
        images: detail.images.length > 0,
        description: Boolean(detail.description),
        specs: false,
      };
    }
    return {
      url: targetUrl,
      title: await page.title().catch(() => "Kids Village"),
      list_ok: rows.length > 0,
      total_count: rows.length,
      estimated_sessions: Math.ceil(rows.length / IMPORT_BATCH_SIZE),
      samples: sampleRows.map((row, idx) => ({
        id: extractKidsVillageCodeFromUrl(row.detailUrl, `kidsvillage-sample-${idx + 1}`),
        title: row.title,
        price_twd: null,
        price_jpy: null,
        detail_url: row.detailUrl,
      })),
      detail_ok: detailFields.title && detailFields.price && detailFields.images,
      detail_fields_presence: detailFields,
    };
  } catch (err) {
    return {
      url: targetUrl,
      title: "Kids Village",
      list_ok: false,
      total_count: 0,
      estimated_sessions: 0,
      samples: [],
      detail_ok: false,
      detail_fields_presence: { title: false, price: false, images: false, description: false, specs: false },
      error: err instanceof Error ? err.message : "Kids Village target probe failed",
    };
  }
};
```

In `runKidsVillageImportPreview`, convert detail data to `DosoImportProduct`:

```ts
const priceTwd = detail.price_krw ? Math.round(detail.price_krw * 0.024) : null;
```

Use existing KRW exchange default until price conversion is centralized.

- [ ] **Step 4: Route Kids Village through existing exported functions**

In `runDosoProbe` and `runDosoImportPreview`, add Kids Village branch before DOSO branch:

```ts
const allKidsVillage = targets.length > 0 && targets.every((target) => isKidsVillageUrl(target));
if (allKidsVillage) {
  const loginOk = await loginKidsVillage(page, input.username, input.password);
  if (!loginOk) return { login_ok: false, products: [], targets: [], error: "Kids Village 登入失敗，用戶名稱或密碼錯誤" };
  return await runKidsVillageImportPreview(page, targets, includeDetails);
}
```

For probe response, return `login_ok: true` and target probe results like Toybox.

- [ ] **Step 5: Run verification**

Run:

```bash
npx tsc --noEmit
npm run lint
```

Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/doso/probeService.ts
git commit -m "新增Kids Village商品詳情爬取"
```

---

### Task 5: Update Import Start Source Resolution

**Files:**
- Modify: `src/app/api/admin/sync/doso/import/start/route.ts`

- [ ] **Step 1: Replace hostname-specific source logic**

Import helpers:

```ts
import { DOSO_TARGET_OPTIONS, getSourceByTargetUrl } from "@/lib/doso/targets";
```

Remove `isToyboxTarget` and use:

```ts
const source = targetUrl ? getSourceByTargetUrl(targetUrl) : null;
if (!source) {
  return NextResponse.json(
    { ok: false, error: "目錄 URL 格式錯誤，請輸入已支援的同步來源網址" } satisfies DosoImportStartApiResponse,
    { status: 400 }
  );
}
const savedCredentials = await getSavedCredentialsForLogin(source);
```

Keep `parseSingleTarget` allowlist based on `DOSO_TARGET_OPTIONS`, so Kids Village category and brand paths are accepted without opening arbitrary domains.

- [ ] **Step 2: Make missing credential error source-neutral**

Change:

```ts
{ ok: false, error: "缺少同步站帳號或密碼，請先輸入或儲存帳密" }
```

- [ ] **Step 3: Run verification**

Run: `npx tsc --noEmit`

Expected: no route type errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/sync/doso/import/start/route.ts
git commit -m "改用來源設定解析同步帳密"
```

---

### Task 6: Add Kids Village Source Category Sync

**Files:**
- Modify: `src/lib/doso/probeService.ts`
- Modify: `src/lib/doso/sourceCategoryStore.ts`

- [ ] **Step 1: Implement Kids Village category extraction**

Add:

```ts
const extractKidsVillageSourceCategories = async (page: any, directoryUrl: string) => {
  await page.goto(directoryUrl, { waitUntil: "networkidle", timeout: 45000 });
  return await page.evaluate(() => {
    const clean = (value: string | null | undefined) => String(value || "").replace(/\s+/g, " ").trim();
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/shop/list.php?ca_id="]'));
    return links.map((a) => {
      const url = new URL(a.href, location.href);
      const caId = url.searchParams.get("ca_id") || "";
      const rawName = clean(a.textContent || "");
      const level = rawName.startsWith("-") || caId.length > 2 ? 2 : 1;
      const parentId = level === 2 ? `kidsvillage:category:${caId.slice(0, 2)}` : null;
      return {
        source_category_id: `kidsvillage:category:${caId}`,
        name: rawName.replace(/^-\s*/, ""),
        parent_id: parentId,
        level,
        directory_url: "https://www.kidsvillage.co.kr/shop/list.php",
      };
    }).filter((node) => node.source_category_id && node.name);
  });
};
```

- [ ] **Step 2: Route source category refresh through Kids Village**

In the exported source category refresh function, add Kids Village branch:

```ts
if (allKidsVillage) {
  const loginOk = await loginKidsVillage(page, input.username, input.password);
  if (!loginOk) return { login_ok: false, categories: {}, error: "Kids Village 登入失敗，用戶名稱或密碼錯誤" };
  for (const target of targets) {
    directories[target] = await extractKidsVillageSourceCategories(page, target);
  }
  return { login_ok: true, categories: directories };
}
```

- [ ] **Step 3: Allow Kids Village target URLs in category store**

In `sourceCategoryStore.ts`, `VALID_DIRECTORY_URLS` already derives from `DOSO_TARGET_OPTIONS`. After Task 1, verify `saveDosoSourceCategoryCache` and `saveDosoSourceCategoryMapping` accept `https://www.kidsvillage.co.kr/shop/list.php` and `https://www.kidsvillage.co.kr/shop/brand.php`.

- [ ] **Step 4: Run verification**

Run:

```bash
npx tsc --noEmit
npm run lint
```

Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/doso/probeService.ts src/lib/doso/sourceCategoryStore.ts
git commit -m "新增Kids Village來源分類同步"
```

---

### Task 7: Refactor Admin Credentials UI To Be Collapsible And Source-Driven

**Files:**
- Modify: `src/components/admin/CrawlerImport.tsx`

- [ ] **Step 1: Replace hardcoded credential states**

Import source options:

```ts
import { DEFAULT_DOSO_TARGETS, DOSO_SOURCE_OPTIONS, DOSO_TARGET_OPTIONS, getTargetOptionByUrl } from "@/lib/doso/targets";
import type { DosoCredentialSource } from "@/lib/doso/targets";
```

Replace individual source states with:

```ts
type CredentialFormState = {
  username: string;
  password: string;
  hasSavedPassword: boolean;
};

const emptyCredentialForms = (): Record<DosoCredentialSource, CredentialFormState> => ({
  doso: { username: "", password: "", hasSavedPassword: false },
  toybox: { username: "", password: "", hasSavedPassword: false },
  kidsvillage: { username: "", password: "", hasSavedPassword: false },
});

const [credentialForms, setCredentialForms] = useState<Record<DosoCredentialSource, CredentialFormState>>(emptyCredentialForms);
const [showCredentialPanel, setShowCredentialPanel] = useState(false);
const [manualTargetUrl, setManualTargetUrl] = useState("");
```

- [ ] **Step 2: Fetch saved credentials for all sources**

Replace the two-source `Promise.all` with:

```ts
const responses = await Promise.all(
  DOSO_SOURCE_OPTIONS.map(async (sourceOption) => {
    const res = await fetch(`/api/admin/sync/doso/credentials?source=${sourceOption.source}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await res.json().catch(() => null)) as DosoCredentialsApiResponse | null;
    return { source: sourceOption.source, res, data };
  })
);

setCredentialForms((prev) => {
  const next = { ...prev };
  for (const item of responses) {
    if (item.res.ok && item.data && item.data.ok) {
      next[item.source] = {
        ...next[item.source],
        username: item.data.username || "",
        hasSavedPassword: Boolean(item.data.has_password),
      };
    }
  }
  return next;
});
```

- [ ] **Step 3: Save credentials by source**

Change `saveSourceCredentials` signature:

```ts
const saveSourceCredentials = async (source: DosoCredentialSource) => {
  const sourceLabel = DOSO_SOURCE_OPTIONS.find((x) => x.source === source)?.label || source;
  const form = credentialForms[source];
  const username = form.username.trim();
  const password = form.password;
  if (!username) {
    alert(`請先輸入 ${sourceLabel} 帳號`);
    return;
  }
  // existing PUT logic, body includes source
};
```

After success:

```ts
setCredentialForms((prev) => ({
  ...prev,
  [source]: { username: data.username || username, password: "", hasSavedPassword: Boolean(data.has_password) },
}));
```

- [ ] **Step 4: Resolve selected target source**

Add:

```ts
const selectedTargetOption = getTargetOptionByUrl(selectedTargetPreset);
const selectedSource = selectedTargetOption?.source || "doso";
const selectedSourceLabel = DOSO_SOURCE_OPTIONS.find((x) => x.source === selectedSource)?.label || selectedSource;
```

In `handleDosoImport`, replace source-specific username/password logic:

```ts
const selectedOption = getTargetOptionByUrl(selectedTargetPreset);
const selectedSource = selectedOption?.source || "doso";
const form = credentialForms[selectedSource];
const username = form.username.trim();
const password = form.password.trim();
const targetUrl = selectedOption?.manualUrlPlaceholder ? (manualTargetUrl.trim() || dosoTargetUrl.trim()) : dosoTargetUrl.trim();
```

Only require password in the form when there is no saved password:

```ts
if (!username || (!password && !form.hasSavedPassword)) {
  alert(`選擇 ${selectedSourceLabel} 時，請先輸入或儲存帳號密碼`);
  return;
}
```

- [ ] **Step 5: Replace credential UI block**

Replace the current `同步站帳密（分開儲存）` block with a collapsible panel:

```tsx
<div className="rounded-lg border border-border-light bg-background-light">
  <button
    type="button"
    onClick={() => setShowCredentialPanel((value) => !value)}
    className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
  >
    <div>
      <div className="text-sm font-medium text-text-primary-light">同步站帳密</div>
      <div className="text-xs text-text-secondary-light">目前來源：{selectedSourceLabel}，密碼以加密方式儲存，不寫死在程式碼。</div>
    </div>
    <span className="material-symbols-outlined text-base">{showCredentialPanel ? "expand_less" : "expand_more"}</span>
  </button>
  {showCredentialPanel && (
    <div className="grid grid-cols-1 gap-4 border-t border-border-light p-3 lg:grid-cols-3">
      {DOSO_SOURCE_OPTIONS.map((sourceOption) => {
        const form = credentialForms[sourceOption.source];
        return (
          <div key={sourceOption.source} className="space-y-3 rounded-lg border border-border-light bg-card-light p-3">
            <div className="text-xs font-semibold text-text-secondary-light">{sourceOption.label}</div>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setCredentialForms((prev) => ({
                ...prev,
                [sourceOption.source]: { ...prev[sourceOption.source], username: e.target.value },
              }))}
              className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
              placeholder={sourceOption.usernamePlaceholder}
            />
            <input
              type="password"
              value={form.password}
              onChange={(e) => setCredentialForms((prev) => ({
                ...prev,
                [sourceOption.source]: { ...prev[sourceOption.source], password: e.target.value },
              }))}
              className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
              placeholder={form.hasSavedPassword ? "已儲存密碼（留空不更新）" : "輸入密碼"}
            />
            <p className="text-xs text-text-secondary-light">{form.hasSavedPassword ? "目前已有已儲存密碼" : "目前尚未儲存密碼"}</p>
            <button
              type="button"
              onClick={() => saveSourceCredentials(sourceOption.source)}
              className="rounded border border-border-light px-3 py-1.5 text-xs text-text-primary-light hover:bg-primary/10"
            >
              儲存 {sourceOption.label} 帳密
            </button>
          </div>
        );
      })}
    </div>
  )}
</div>
```

- [ ] **Step 6: Replace Toybox-only manual URL block**

Render manual URL when target option has a placeholder:

```tsx
{selectedTargetOption?.manualUrlPlaceholder && (
  <div>
    <label className="block text-sm font-medium text-text-primary-light mb-1">{selectedTargetOption.label} 目標網址（可貼上）</label>
    <input
      type="text"
      value={manualTargetUrl}
      onChange={(e) => {
        setManualTargetUrl(e.target.value);
        setDosoTargetUrl(e.target.value);
      }}
      className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
      placeholder={selectedTargetOption.manualUrlPlaceholder}
    />
    <p className="mt-1 text-xs text-text-secondary-light">{selectedTargetOption.manualUrlHelp}</p>
  </div>
)}
```

- [ ] **Step 7: Run verification**

Run:

```bash
npx tsc --noEmit
npm run lint
```

Expected: both pass.

- [ ] **Step 8: Commit**

```bash
git add src/components/admin/CrawlerImport.tsx
git commit -m "優化同步站帳密收合介面"
```

---

### Task 8: Verify Kids Village With Agent Browser

**Files:**
- No code changes unless selectors fail verification.

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

Expected: app serves on `http://localhost:3003`.

- [ ] **Step 2: Use agent-browser to verify public structure**

Run:

```bash
AGENT_BROWSER_EXECUTABLE_PATH="/snap/bin/chromium" agent-browser --session kidsvillage-check open "https://www.kidsvillage.co.kr/shop/brand.php"
AGENT_BROWSER_EXECUTABLE_PATH="/snap/bin/chromium" agent-browser --session kidsvillage-check wait --load networkidle
AGENT_BROWSER_EXECUTABLE_PATH="/snap/bin/chromium" agent-browser --session kidsvillage-check snapshot -i
```

Expected: page shows left category links, right brand links, product links, and pagination.

- [ ] **Step 3: Save Kids Village credentials in admin**

Open admin crawler page, expand `同步站帳密`, fill Kids Village username/password, and click `儲存 Kids Village 帳密`.

Expected: UI shows `目前已有已儲存密碼` for Kids Village. Do not hardcode the credentials in code, tests, docs, or shell history.

- [ ] **Step 4: Run source category refresh**

Use the existing admin source category refresh flow for `Kids Village 分類`.

Expected: cache includes nodes like `kidsvillage:category:10`, `kidsvillage:category:1010`, `kidsvillage:category:d040`.

- [ ] **Step 5: Create import session from category URL**

Select `Kids Village 分類`, set manual URL to:

```text
https://www.kidsvillage.co.kr/shop/list.php?ca_id=10
```

Click `同步商品（建立新任務）`.

Expected: session is created, total count is greater than `0`, and product payloads include `productCode`, `title`, `url`, `images`, `wholesalePriceTWD`, `sourceCategoryId`, and `sourceCategoryName`.

- [ ] **Step 6: Create import session from brand URL**

Select `Kids Village 品牌`, set manual URL to:

```text
https://www.kidsvillage.co.kr/shop/brand.php?sort_id=&br_id=418
```

Click `同步商品（建立新任務）`.

Expected: session is created and product payloads use brand source fallback only if category breadcrumbs are unavailable.

- [ ] **Step 7: Verify detail fields with agent-browser**

After admin credentials are available, use the scraper flow or a manual agent-browser login session to open a detail URL such as:

```text
https://www.kidsvillage.co.kr/shop/item.php?it_id=2C1777262389
```

Expected after login: detail page does not redirect to `/bbs/register.php`, product name is present, KRW wholesale price is present, product images are from product/detail image paths, and description/detail content is non-empty.

- [ ] **Step 8: Final verification**

Run:

```bash
npx tsc --noEmit
npm run lint
```

Expected: both pass.

- [ ] **Step 9: Commit selector fixes if needed**

If verification required selector changes:

```bash
git add src/lib/doso/probeService.ts src/components/admin/CrawlerImport.tsx
git commit -m "修正Kids Village同步欄位解析"
```

---

## Self-Review

- Spec coverage: Kids Village website node is added through target options; admin credential entry is added; credentials remain encrypted and not hardcoded; credential block is collapsible; agent-browser verification steps cover login page, category/brand decision, list pages, and detail fields.
- Category vs brand decision: default and source mapping use category because it is stable taxonomy; brand import remains supported for vendor-specific scraping.
- Detail-page limitation: unauthenticated detail redirects to registration, so final selector verification requires real saved Kids Village credentials.
- No database migration is required because credentials and category mapping use existing `system_settings`, and import sessions already store target URL/payload JSON.
- Verification gate: `npx tsc --noEmit`, `npm run lint`, and agent-browser detail verification after credentials are saved.
