import { chromium } from "playwright";
import { DEFAULT_DOSO_TARGETS } from "@/lib/doso/targets";
import { getDosoCatalogListConfig } from "@/lib/doso/catalogConfigs";
import type {
  DosoImportProduct,
  DosoImportResponse,
  DosoImportTargetResult,
  DosoProbeResponse,
  DosoSourceCategoryNode,
  DosoProbeTargetResult,
} from "@/lib/doso/types";

interface CapturedResponse {
  url: string;
  body: string;
}

const LOGIN_URL = "https://www.doso.net/auth/login";
const TOYBOX_LOGIN_URL = "https://www.toybox.kr/shop/member.html?type=login";
const KIDSVILLAGE_LOGIN_URL = "https://www.kidsvillage.co.kr/bbs/login.php?url=%2Fshop%2Fbrand.php";
const MAX_IMPORT_ROWS_PER_TARGET = 20000;
const IMPORT_BATCH_SIZE = 20;
const CATALOG_API_TIMEOUT_MS = 45000;
const CATALOG_API_RETRY_TIMES = 2;
const KRW_TO_TWD_RATE = 0.024;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isToyboxUrl = (value: string) => {
  try {
    const u = new URL(value);
    return u.hostname === "www.toybox.kr" || u.hostname === "toybox.kr";
  } catch {
    return false;
  }
};

const isKidsVillageUrl = (value: string) => {
  try {
    const u = new URL(value);
    return u.hostname === "www.kidsvillage.co.kr" || u.hostname === "kidsvillage.co.kr";
  } catch {
    return false;
  }
};

interface KidsVillageListRow {
  title: string;
  detailUrl: string;
  image?: string | null;
  sourceCategoryId?: string | null;
  sourceCategoryName?: string | null;
}

const toAbsoluteUrl = (baseUrl: string, href: string) => {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
};

const extractToyboxCodeFromUrl = (rawUrl: string, fallback?: string) => {
  try {
    const u = new URL(rawUrl);
    const branduid = u.searchParams.get("branduid");
    if (branduid && /^\d+$/.test(branduid)) return `tb-${branduid}`;
    const uid = u.searchParams.get("uid");
    if (uid && /^\d+$/.test(uid)) return `tb-${uid}`;
    const productNo = u.searchParams.get("product_no");
    if (productNo && /^\d+$/.test(productNo)) return `tb-${productNo}`;
  } catch {
    // noop
  }
  return fallback || `tb-${Date.now()}`;
};

const isRequestTimeoutError = (err: unknown) => {
  const message = err instanceof Error ? err.message : String(err || "");
  return /timeout|timed out|etimedout/i.test(message);
};

const safeJson = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const hasAny = (obj: any, keys: string[]) => keys.some((k) => obj?.[k] !== undefined && obj?.[k] !== null && obj?.[k] !== "");

const isLikelyProductRow = (row: any): boolean => {
  if (!row || typeof row !== "object") return false;

  const hasId = hasAny(row, ["id", "goods_id", "product_id", "site_id", "code", "sku", "item_id", "spu_id"]);
  const hasTitle = hasAny(row, ["title", "goods_name", "product_name", "name", "name_tw", "name_cn", "name_jp", "item_name"]);
  const hasPrice = hasAny(row, [
    "price",
    "price_jpy",
    "price_twd",
    "jpy_price",
    "twd_price",
    "wholesale_price",
    "wholesale_price_jpy",
    "wholesale_price_twd",
  ]);
  const hasImage = hasAny(row, ["image", "img", "main_pic", "main_image", "goods_image", "thumb", "thumbnail", "images"]);
  const hasDetail = hasAny(row, ["detail_url", "url", "link"]);
  const hasCommerceHints = hasAny(row, [
    "market_price",
    "sale_price",
    "min_price",
    "max_price",
    "price_range",
    "inventory",
    "stock",
  ]);
  const looksCategoryOnly = hasAny(row, ["parent_id", "level", "children_count", "child_count", "category_id"]);

  if (!hasId || !hasTitle) return false;
  if (hasPrice || hasDetail || hasCommerceHints) return true;
  if (hasImage && !looksCategoryOnly && hasCommerceHints) return true;
  if (looksCategoryOnly) return false;

  return false;
};

const countLikelyProductRows = (rows: any[]) => rows.reduce((n, row) => n + (isLikelyProductRow(row) ? 1 : 0), 0);

const pickRows = (payload: any): any[] => {
  const candidates = [
    payload?.result?.data,
    payload?.result?.list,
    payload?.result?.rows,
    payload?.result?.records,
    payload?.result?.items,
    payload?.result?.goods,
    payload?.result?.goodsList,
    payload?.result?.productList,
    payload?.result?.page?.list,
    payload?.result?.page?.records,
    payload?.result?.page?.items,
    payload?.result?.pageData?.list,
    payload?.result?.pageData?.records,
    payload?.result?.pageData?.items,
    payload?.data?.list,
    payload?.data?.rows,
    payload?.data?.records,
    payload?.data?.items,
    payload?.data?.goods,
    payload?.data?.goodsList,
    payload?.data?.productList,
    payload?.data?.page?.list,
    payload?.data?.page?.records,
    payload?.data?.page?.items,
    payload?.data?.pageData?.list,
    payload?.data?.pageData?.records,
    payload?.data?.pageData?.items,
    payload?.rows,
    payload?.records,
    payload?.list,
    payload?.items,
    payload?.result,
  ];

  let fallbackRows: any[] = [];

  for (const c of candidates) {
    if (!Array.isArray(c)) continue;
    if (c.length === 0) continue;
    if (countLikelyProductRows(c) > 0) return c;
    if (fallbackRows.length === 0) fallbackRows = c;
  }

  const queue: any[] = [payload?.result, payload?.data, payload];
  const visited = new Set<any>();
  let depth = 0;

  while (queue.length > 0 && depth < 80) {
    const current = queue.shift();
    depth += 1;

    if (!current || typeof current !== "object") continue;
    if (visited.has(current)) continue;
    visited.add(current);

    if (Array.isArray(current)) {
      if (current.length === 0) continue;
      const first = current[0];
      if (first && typeof first === "object" && countLikelyProductRows(current) > 0) {
        return current;
      }
      if (fallbackRows.length === 0) fallbackRows = current;
      continue;
    }

    for (const value of Object.values(current)) {
      if (value && typeof value === "object") queue.push(value);
    }
  }

  return fallbackRows;
};

const scorePayloadByProductLikelihood = (payload: any) => {
  const rows = pickRows(payload);
  const productLikeCount = countLikelyProductRows(rows);
  const total = pickTotalCount(payload, rows);
  const productRatio = rows.length > 0 ? productLikeCount / rows.length : 0;
  const ratioScore = Math.floor(productRatio * 2000);
  const totalScore = Math.min(Math.max(0, total), 50000);
  const countScore = Math.min(productLikeCount, 500);

  return {
    rows,
    productLikeCount,
    total,
    score: totalScore * 10 + ratioScore + countScore,
  };
};

const pickTotalCount = (payload: any, fallbackRows: any[] = []): number => {
  const candidates = [
    payload?.result?.total,
    payload?.result?.totalCount,
    payload?.result?.count,
    payload?.result?.pagination?.total,
    payload?.result?.pagination?.count,
    payload?.result?.pager?.total,
    payload?.result?.pager?.count,
    payload?.result?.pageInfo?.total,
    payload?.result?.pageInfo?.count,
    payload?.result?.pageInfo?.totalCount,
    payload?.result?.data?.total,
    payload?.result?.data?.count,
    payload?.result?.data?.total_num,
    payload?.result?.data?.totalNum,
    payload?.result?.data?.page?.total,
    payload?.result?.data?.page?.count,
    payload?.result?.data?.pageData?.total,
    payload?.result?.data?.pageData?.count,
    payload?.data?.total,
    payload?.data?.count,
    payload?.data?.pagination?.total,
    payload?.data?.pagination?.count,
    payload?.data?.pager?.total,
    payload?.data?.pager?.count,
    payload?.data?.pageInfo?.total,
    payload?.data?.pageInfo?.count,
    payload?.data?.pageInfo?.totalCount,
    payload?.data?.data?.total,
    payload?.data?.data?.count,
    payload?.data?.data?.total_num,
    payload?.data?.data?.totalNum,
    payload?.data?.data?.page?.total,
    payload?.data?.data?.page?.count,
    payload?.data?.data?.pageData?.total,
    payload?.data?.data?.pageData?.count,
    payload?.result?.total_num,
    payload?.result?.totalNum,
    payload?.result?.page?.total,
    payload?.result?.page?.count,
    payload?.result?.pageData?.total,
    payload?.result?.pageData?.count,
    payload?.data?.total_num,
    payload?.data?.totalNum,
    payload?.data?.page?.total,
    payload?.data?.page?.count,
    payload?.data?.pageData?.total,
    payload?.data?.pageData?.count,
    payload?.total,
    payload?.count,
    payload?.total_num,
    payload?.totalNum,
  ];

  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }

  return fallbackRows.length;
};

const scoreListCaptureUrl = (url: string) => {
  const u = url.toLowerCase();

  let score = 0;
  if (/goods|product|item|sku|spu/.test(u)) score += 2000;
  if (/search|get.*list|query/.test(u)) score += 200;

  if (/category|cate|classify|taxonomy/.test(u)) score -= 3000;
  if (/brand|banner|notice|announcement|history/.test(u)) score -= 500;

  return score;
};

const extractDomOverallTotal = async (page: any): Promise<number | null> => {
  try {
    const text = await page.evaluate(() => (document.body?.innerText || "").replace(/\s+/g, " "));
    if (!text) return null;

    const candidates: number[] = [];
    const patterns = [
      /全\s*([\d,]+)\s*件/g,
      /總\s*([\d,]+)\s*件/g,
      /total\s*[:：]?\s*([\d,]+)/gi,
    ];

    for (const pattern of patterns) {
      let match: RegExpExecArray | null = null;
      while ((match = pattern.exec(text)) !== null) {
        const n = Number(String(match[1] || "").replace(/,/g, ""));
        if (Number.isFinite(n) && n > 0) candidates.push(n);
      }
    }

    if (candidates.length === 0) return null;
    return Math.max(...candidates);
  } catch {
    return null;
  }
};

const inferDetailUrl = (targetUrl: string, id: string) => {
  if (!id) return null;
  const path = new URL(targetUrl).pathname;

  if (path === "/onlineMall/selfOperatedMall" || path === "/onlineMall/PreSelfOperatedMall") {
    return `https://www.doso.net/onlineMall/selfOperatedMall/SelfOperatedGoodsDetailPage/${id}`;
  }
  if (path === "/onlineMall/etonet" || path === "/onlineMall/etonetRanking") {
    return `https://www.doso.net/onlineMall/etonet/DetailPage/${id}`;
  }
  if (path === "/onlineMall/tanbaya") {
    return `https://www.doso.net/onlineMall/tanbaya/tanbayaDetailPage/${id}`;
  }

  return null;
};

const parseSamples = (payload: any) => {
  const rows = pickRows(payload);
  return rows.slice(0, 3).map((row: any) => {
    const id = String(
      row.id ?? row.goods_id ?? row.product_id ?? row.site_id ?? row.code ?? row.sku ?? ""
    );
    const title = String(row.title ?? row.goods_name ?? row.name ?? row.product_name ?? "");
    const detailUrl =
      row.detail_url ||
      row.url ||
      row.link ||
      null;

    return {
      id,
      title,
      price_twd: row.price_twd ?? row.twd_price ?? row.price_twd_tax ?? null,
      price_jpy: row.price_jpy ?? row.price ?? row.jpy_price ?? null,
      detail_url: detailUrl,
    };
  });
};

const toNumber = (value: any): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const collectImages = (row: any): string[] => {
  const candidates: string[] = [];
  const listCandidates = [
    row.images,
    row.image_list,
    row.img_list,
    row.goods_images,
    row.gallery,
  ];

  for (const list of listCandidates) {
    if (Array.isArray(list)) {
      for (const x of list) {
        if (typeof x === "string") candidates.push(x);
        else if (x?.url) candidates.push(String(x.url));
        else if (x?.src) candidates.push(String(x.src));
      }
    }
  }

  const singleCandidates = [
    row.image,
    row.img,
    row.main_pic,
    row.main_image,
    row.goods_image,
    row.thumb,
    row.thumbnail,
  ];

  for (const x of singleCandidates) {
    if (typeof x === "string" && x) candidates.push(x);
  }

  return Array.from(new Set(candidates.filter(Boolean)));
};

const isLikelyProductImageUrl = (url: string) => {
  if (!url) return false;
  const u = url.trim();
  if (!/^https?:\/\//i.test(u)) return false;
  if (!/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(u)) return false;

  // DOSO 與各目錄常見圖床來源
  if (/images\.doso\.net/i.test(u)) return true;
  if (/mydoso\.oss-cn-shanghai\.aliyuncs\.com/i.test(u)) return true;
  if (/etonet\.etoile\.co\.jp/i.test(u)) return true;
  if (/files\.tanbaya1690\.co\.jp/i.test(u)) return true;
  if (/webshop\.self\.co\.jp/i.test(u)) return true;
  if (/fanbi-store\.jp/i.test(u)) return true;
  if (/makeshop-multi-images\.akamaized\.net/i.test(u)) return true;
  if (/gomen\.jp/i.test(u)) return true;

  return false;
};

const normalizeImageUrls = (urls: string[]) => {
  return Array.from(new Set(urls.map((u) => u.trim()).filter((u) => isLikelyProductImageUrl(u))));
};

const extractImageUrlsFromText = (text: string) => {
  const matched =
    text.match(/https?:\/\/[^\s\"'<>]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s\"'<>]*)?/gi) || [];
  return normalizeImageUrls(matched);
};

const getDetailEndpoint = (targetUrl: string) => {
  const path = new URL(targetUrl).pathname;

  if (path === "/onlineMall/selfOperatedMall" || path === "/onlineMall/PreSelfOperatedMall") {
    return "https://www.doso.net/mydoso/online_mall.selfOperatedMall/getSelfOperatedGoodsDetail";
  }
  if (path === "/onlineMall/etonet" || path === "/onlineMall/etonetRanking") {
    return "https://www.doso.net/mydoso/etonet.etonetGoods/getGoodsDetail";
  }
  if (path === "/onlineMall/tanbaya") {
    return "https://www.doso.net/mydoso/tanbaya.TanbayaGoods/getGoodsDetail";
  }
  if (path === "/onlineMall/dabandaxi") {
    return "https://www.doso.net/mydoso/dabandaxi.DabandaxiGoods/getGoodsDetail";
  }
  if (path === "/onlineMall/dabansinei" || path === "/onlineMall/shineiRanking") {
    return "https://www.doso.net/mydoso/dabansinei.DabansineiGoods/getGoodsDetail";
  }
  if (path === "/onlineMall/gomen") {
    return "https://www.doso.net/mydoso/gomen.GomenGoods/getGoodsDetail";
  }

  return null;
};

const normalizeDetailObject = (payload: any): any => {
  const cands = [payload?.result?.data, payload?.result?.item, payload?.result, payload?.data, payload];
  for (const c of cands) {
    if (Array.isArray(c) && c.length > 0) return c[0];
    if (c && typeof c === "object") return c;
  }
  return null;
};

const specsToText = (value: any): string => {
  if (!value) return "";

  if (typeof value === "string") return value.trim();

  if (!Array.isArray(value)) return "";

  const lines = value
    .map((row: any) => {
      if (typeof row === "string") return row.trim();
      if (!row || typeof row !== "object") return "";

      const k = String(row.name ?? row.key ?? row.title ?? row.label ?? "").trim();
      const rawV = row.value ?? row.values ?? row.content ?? row.text ?? "";
      const v = Array.isArray(rawV)
        ? rawV.map((x) => String(x).trim()).filter(Boolean).join("/")
        : String(rawV).trim();

      if (!k && !v) return "";
      return `${k}: ${v}`.trim();
    })
    .filter(Boolean);

  return lines.join("\n");
};

const mergeDetailIntoProduct = (product: DosoImportProduct, detailPayload: any): DosoImportProduct => {
  const d = normalizeDetailObject(detailPayload);
  if (!d) return product;

  const desc = String(
    d.description ?? d.desc ?? d.detail ?? d.content ?? d.goods_desc ?? d.intro ?? d.goods_intro ?? ""
  ).trim();
  const specsText = specsToText(d.specs ?? d.spec ?? d.attributes ?? d.attr_list ?? d.spec_list);

  const description = [product.description, desc, specsText]
    .map((x) => (x || "").trim())
    .filter(Boolean)
    .join("\n\n");

  const mergedImages = normalizeImageUrls([...product.images, ...collectImages(d)]);

  const merged: DosoImportProduct = {
    ...product,
    description: description || product.description,
    images: mergedImages,
  };

  if (merged.wholesalePriceTWD === undefined) {
    const twd =
      toNumber(d.price_twd) ??
      toNumber(d.twd_price) ??
      toNumber(d.wholesale_price_twd) ??
      toNumber(d.price_ntd);
    if (twd !== null) merged.wholesalePriceTWD = Math.floor(twd);
  }

  if (merged.wholesalePriceTWD === undefined && merged.wholesalePriceJPY === undefined) {
    const jpy =
      toNumber(d.price_jpy) ??
      toNumber(d.price) ??
      toNumber(d.jpy_price) ??
      toNumber(d.wholesale_price_jpy);
    if (jpy !== null) merged.wholesalePriceJPY = Math.floor(jpy);
  }

  return merged;
};

const fetchDetailPayload = async (context: any, targetUrl: string, productCode: string) => {
  const endpoint = getDetailEndpoint(targetUrl);
  if (!endpoint || !productCode) return null;

  const encoded = encodeURIComponent(productCode);
  const queryUrl = `${endpoint}?id=${encoded}&goods_id=${encoded}&product_id=${encoded}&site_id=${encoded}`;

  try {
    const getResp = await context.request.get(queryUrl, { timeout: 15000 });
    if (getResp.ok()) {
      const text = await getResp.text();
      const json = safeJson(text);
      if (json && (json.code === 0 || json.result || json.data)) return json;
    }
  } catch {
    // noop
  }

  const bodies = [
    { id: productCode },
    { goods_id: productCode },
    { product_id: productCode },
    { site_id: productCode },
    { id: productCode, goods_id: productCode, product_id: productCode, site_id: productCode },
  ];

  for (const body of bodies) {
    try {
      const postResp = await context.request.post(endpoint, {
        data: body,
        timeout: 15000,
      });
      if (!postResp.ok()) continue;
      const text = await postResp.text();
      const json = safeJson(text);
      if (json && (json.code === 0 || json.result || json.data)) return json;
    } catch {
      // noop
    }
  }

  return null;
};

const extractDetailImagesViaBrowser = async (
  page: any,
  productCode: string
): Promise<string[]> => {
  if (!productCode) return [];

  try {
    const found = await page.evaluate((code: string) => {
      const out = new Set<string>();

      const addFromText = (text: string) => {
        if (!text) return;
        const matched = text.match(/https?:\/\/[^\s\"'<>]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s\"'<>]*)?/gi) || [];
        for (const m of matched) out.add(m);
      };

      const imgs = Array.from(document.querySelectorAll("img"));
      for (const img of imgs) {
        const cls = String(img.className || "");
        if (/vben-menu__icon|tabs-chrome|size-4|logo/i.test(cls)) continue;

        const attrs = [
          img.getAttribute("src") || "",
          img.getAttribute("data-src") || "",
          img.getAttribute("data-original") || "",
          img.getAttribute("srcset") || "",
        ];

        for (const x of attrs) {
          if (!x) continue;
          addFromText(x);
        }
      }

      const keys = Object.keys(sessionStorage);
      for (const key of keys) {
        try {
          const raw = sessionStorage.getItem(key) || "";
          if (!raw || !raw.includes(code)) continue;
          addFromText(raw);
        } catch {
          // noop
        }
      }

      return Array.from(out);
    }, productCode);

    return normalizeImageUrls(found);
  } catch {
    return [];
  }
};

const enrichProductsWithDetails = async (
  context: any,
  page: any,
  targetUrl: string,
  products: DosoImportProduct[]
): Promise<DosoImportProduct[]> => {
  const out: DosoImportProduct[] = [];

  for (const p of products) {
    const detail = await fetchDetailPayload(context, targetUrl, p.productCode);
    const merged = detail ? mergeDetailIntoProduct(p, detail) : p;

    const browserImages = await extractDetailImagesViaBrowser(page, merged.productCode);
    const descImages = extractImageUrlsFromText(merged.description || "");
    const withBrowserImages: DosoImportProduct = {
      ...merged,
      images: normalizeImageUrls([...merged.images, ...browserImages, ...descImages]),
    };

    out.push(withBrowserImages);
  }

  return out;
};

const mapRowToImportProduct = (targetUrl: string, row: any): DosoImportProduct | null => {
  const rawId =
    row.id ?? row.goods_id ?? row.product_id ?? row.site_id ?? row.code ?? row.sku ?? row.item_id;
  const productCode = String(rawId || "").trim();
  const title = String(row.title ?? row.goods_name ?? row.name ?? row.product_name ?? "").trim();

  if (!productCode || !title) return null;

  const detailUrl =
    row.detail_url || row.url || row.link || inferDetailUrl(targetUrl, productCode) || null;
  const description = String(
    row.description ?? row.desc ?? row.brief ?? row.remark ?? row.summary ?? ""
  ).trim();

  const images = collectImages(row);

  const priceTwd =
    toNumber(row.price_twd) ??
    toNumber(row.twd_price) ??
    toNumber(row.wholesale_price_twd) ??
    toNumber(row.price_ntd);

  const priceJpy =
    toNumber(row.price_jpy) ??
    toNumber(row.price) ??
    toNumber(row.jpy_price) ??
    toNumber(row.wholesale_price_jpy);

  const mapped: DosoImportProduct = {
    productCode,
    title,
    description,
    url: detailUrl,
    images,
    sourceCategoryId: String(row.category_id ?? row.cate_id ?? row.category ?? "").trim() || null,
    sourceCategoryName: String(row.category_name ?? row.categoryName ?? row.cate_name ?? "").trim() || null,
    sourceDirectoryUrl: targetUrl,
  };

  if (priceTwd !== null) mapped.wholesalePriceTWD = Math.floor(priceTwd);
  else if (priceJpy !== null) mapped.wholesalePriceJPY = Math.floor(priceJpy);

  return mapped;
};

const probeDetail = async (page: any, detailUrl: string | null) => {
  const defaultFields = {
    title: false,
    price: false,
    images: false,
    description: false,
    specs: false,
  };

  if (!detailUrl) {
    return { detail_ok: false, detail_fields_presence: defaultFields };
  }

  try {
    await page.goto(detailUrl, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(1200);

    const stats = await page.evaluate(() => {
      const text = (document.body?.innerText || "").replace(/\s+/g, " ");
      const imgCount = document.querySelectorAll("img").length;

      return {
        hasTitle: document.title.length > 0 || /商品詳情|DetailPage|詳情/.test(text),
        hasPrice: /(JPY|日圓|新台幣|\$|¥|NTD)/i.test(text),
        hasImages: imgCount > 5,
        hasDescription: /(聲明|詳細|详细|説明|描述|商品)/.test(text),
        hasSpecs: /(規格|規格|庫存|SKU|發售日期|選擇規格)/.test(text),
      };
    });

    return {
      detail_ok: Boolean(stats.hasTitle || stats.hasPrice),
      detail_fields_presence: {
        title: Boolean(stats.hasTitle),
        price: Boolean(stats.hasPrice),
        images: Boolean(stats.hasImages),
        description: Boolean(stats.hasDescription),
        specs: Boolean(stats.hasSpecs),
      },
    };
  } catch {
    return { detail_ok: false, detail_fields_presence: defaultFields };
  }
};

const pickListPayload = (targetUrl: string, captures: CapturedResponse[]) => {
  const targetPath = new URL(targetUrl).pathname;
  const byPath: Record<string, RegExp> = {
    "/onlineMall/selfOperatedMall": /online_mall\.selfOperatedMall\/getList/i,
    "/onlineMall/PreSelfOperatedMall": /online_mall\.selfOperatedMall\/getList/i,
    "/onlineMall/etonet": /etonet\.etonetGoods\/getList/i,
    "/onlineMall/etonetRanking": /etonet\.etonetGoods\/getEtonetRankingList/i,
    "/onlineMall/tanbaya": /tanbaya\.TanbayaGoods\/getList/i,
    "/onlineMall/dabandaxi": /dabandaxi\.DabandaxiGoods\/getList/i,
    "/onlineMall/dabansinei": /dabansinei\.DabansineiGoods\/getList/i,
    "/onlineMall/shineiRanking": /dabansinei\.DabansineiGoods\/getList/i,
    "/onlineMall/gomen": /gomen\.GomenGoods\/getList/i,
  };

  const pattern = byPath[targetPath] || /Goods\/getList|getEtonetRankingList|selfOperatedMall\/getList/i;
  const matched = [...captures].filter((x) => pattern.test(x.url));

  if (matched.length > 0) {
    let best: { payload: any; score: number } | null = null;
    for (const cap of [...matched].reverse()) {
      const payload = safeJson(cap.body);
      if (!payload) continue;
      const scored = scorePayloadByProductLikelihood(payload);
      const urlScore = scoreListCaptureUrl(cap.url);
      const finalScore = scored.score + urlScore;
      if (!best || finalScore >= best.score) {
        best = { payload, score: finalScore };
      }
    }
    if (best) return best.payload;
  }

  const moduleHintByPath: Record<string, RegExp> = {
    "/onlineMall/selfOperatedMall": /\/mydoso\/(online_mall\.|selfOperatedMall)/i,
    "/onlineMall/PreSelfOperatedMall": /\/mydoso\/(online_mall\.|selfOperatedMall)/i,
    "/onlineMall/etonet": /\/mydoso\/etonet\./i,
    "/onlineMall/etonetRanking": /\/mydoso\/etonet\./i,
    "/onlineMall/tanbaya": /\/mydoso\/tanbaya\./i,
    "/onlineMall/dabandaxi": /\/mydoso\/dabandaxi\./i,
    "/onlineMall/dabansinei": /\/mydoso\/dabansinei\./i,
    "/onlineMall/shineiRanking": /\/mydoso\/dabansinei\./i,
    "/onlineMall/gomen": /\/mydoso\/gomen\./i,
  };

  const moduleHint = moduleHintByPath[targetPath];
  if (moduleHint) {
    let best: { payload: any; score: number } | null = null;
    for (const cap of [...captures].reverse()) {
      if (!moduleHint.test(cap.url)) continue;
      const payload = safeJson(cap.body);
      if (!payload) continue;
      const rows = pickRows(payload);
      if (rows.length > 0 || pickTotalCount(payload, rows) > 0) {
        const scored = scorePayloadByProductLikelihood(payload);
        const finalScore = scored.score + scoreListCaptureUrl(cap.url);
        if (!best || finalScore > best.score) {
          best = { payload, score: finalScore };
        }
      }
    }
    if (best) return best.payload;
  }

  let bestGlobal: { payload: any; score: number } | null = null;
  for (const cap of [...captures].reverse()) {
    if (!/\/mydoso\//i.test(cap.url)) continue;
    const payload = safeJson(cap.body);
    if (!payload) continue;
    const rows = pickRows(payload);
    if (rows.length > 0 || pickTotalCount(payload, rows) > 0) {
      const scored = scorePayloadByProductLikelihood(payload);
      const finalScore = scored.score + scoreListCaptureUrl(cap.url);
      if (!bestGlobal || finalScore > bestGlobal.score) {
        bestGlobal = { payload, score: finalScore };
      }
    }
  }

  if (bestGlobal) return bestGlobal.payload;

  return null;
};

const getRowIdentity = (row: any) =>
  String(
    row?.id ?? row?.goods_id ?? row?.product_id ?? row?.site_id ?? row?.code ?? row?.sku ?? row?.item_id ?? ""
  ).trim();

const getDosoAccessTokenFromPage = async (page: any): Promise<string> => {
  try {
    const token = await page.evaluate(() => {
      try {
        const app = (document.querySelector("#app") as any)?.__vue_app__;
        const piniaToken = app?.config?.globalProperties?.$pinia?.state?.value?.["core-access"]?.accessToken;
        if (typeof piniaToken === "string" && piniaToken.trim()) return piniaToken.trim();
      } catch {
        // noop
      }

      try {
        const keys = Object.keys(localStorage || {});
        for (const key of keys) {
          if (!/^vben-web-a/i.test(key)) continue;
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          const token = parsed?.accessToken;
          if (typeof token === "string" && token.trim()) return token.trim();
        }
      } catch {
        // noop
      }

      return "";
    });
    return String(token || "").trim();
  } catch {
    return "";
  }
};

const fetchCatalogRowsViaApi = async (
  context: any,
  page: any,
  targetUrl: string,
  maxPages: number = 500
): Promise<any[]> => {
  const config = getDosoCatalogListConfig(targetUrl);
  if (!config) return [];

  const token = await getDosoAccessTokenFromPage(page);
  if (!token) return [];

  const headers = {
    Authorization: token,
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "zh-TW",
  } as Record<string, string>;

  const mergedRows: any[] = [];
  const seen = new Set<string>();

  let pageNo = 1;
  let total = 0;
  let lastPageHint = 0;

  while (pageNo <= maxPages) {
    const payload = config.buildPayload(pageNo, total, lastPageHint);
    let resp: any = null;

    for (let attempt = 0; attempt <= CATALOG_API_RETRY_TIMES; attempt += 1) {
      try {
        resp =
          config.method === "GET"
            ? await context.request.get(config.endpoint, {
                params: payload,
                headers,
                timeout: CATALOG_API_TIMEOUT_MS,
              })
            : await context.request.post(config.endpoint, {
                data: payload,
                headers: {
                  ...headers,
                  "Content-Type": "application/json;charset=UTF-8",
                },
                timeout: CATALOG_API_TIMEOUT_MS,
              });
        break;
      } catch (err) {
        if (isRequestTimeoutError(err) && attempt < CATALOG_API_RETRY_TIMES) {
          await sleep(600 * (attempt + 1));
          continue;
        }
        resp = null;
        break;
      }
    }

    if (!resp) break;

    if (!resp.ok()) break;

    const text = await resp.text();
    const json = safeJson(text);
    if (!json || Number(json?.code) !== 0) break;

    const rows = config.extractRows(json);
    const safeRows = Array.isArray(rows) ? rows : [];

    const extractedTotal = config.extractTotal(json);
    if (Number.isFinite(extractedTotal) && extractedTotal > 0) {
      total = Math.floor(extractedTotal);
      lastPageHint = Math.max(1, Math.ceil(total / Math.max(1, config.pageSize)));
    }

    for (const row of safeRows) {
      const key = getRowIdentity(row);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      mergedRows.push(row);
    }

    const hasNext = config.hasNextPage(json, safeRows);
    if (!hasNext) break;

    pageNo += 1;
  }

  return mergedRows;
};

const clickListNextPage = async (page: any) => {
  return page.evaluate(() => {
    const isDisabled = (el: HTMLElement | null) => {
      if (!el) return true;
      const anyEl = el as HTMLButtonElement;
      const cls = String(el.className || "");
      const ariaDisabled = (el.getAttribute("aria-disabled") || "").toLowerCase();
      const style = window.getComputedStyle(el);
      return (
        anyEl.disabled === true ||
        el.getAttribute("disabled") !== null ||
        ariaDisabled === "true" ||
        /disabled|is-disabled|ant-pagination-disabled/i.test(cls) ||
        style.pointerEvents === "none"
      );
    };

    const selectors = [
      ".ant-pagination-next:not(.ant-pagination-disabled) button",
      ".ant-pagination-next:not(.ant-pagination-disabled)",
      "li.ant-pagination-next button",
      "li.ant-pagination-next",
      ".pagination-next:not(.disabled)",
      "button[aria-label='Next Page']",
      "button[aria-label='next page']",
      "button[aria-label='next']",
      "a[aria-label='Next Page']",
      "a[aria-label='next page']",
      "button[title='Next Page']",
      "button[title='next page']",
      "button[title='下一頁']",
      "a[title='下一頁']",
      "button[title='right']",
      "button[aria-label='right']",
      "button .anticon-right",
      "button .icon-right",
    ];

    for (const selector of selectors) {
      const node = document.querySelector(selector) as HTMLElement | null;
      if (!node) continue;
      const target = (node.closest("button,a,li") as HTMLElement | null) || node;
      if (isDisabled(target)) continue;
      target.click();
      return true;
    }

    const fallbackButtons = Array.from(document.querySelectorAll("button,a")) as HTMLElement[];
    const textHit = fallbackButtons.find((el) => {
      const t = (el.textContent || "").trim();
      if (!t) return false;
      if (!/下一頁|next|right|>|»|›|→/i.test(t)) return false;
      return !isDisabled(el);
    });
    if (textHit) {
      textHit.click();
      return true;
    }

    const iconHit = fallbackButtons.find((el) => {
      if (isDisabled(el)) return false;
      const html = el.innerHTML || "";
      return /anticon-right|icon-right|caret-right|arrow-right/i.test(html);
    });
    if (iconHit) {
      iconHit.click();
      return true;
    }

    const activeItem = document.querySelector("li.ant-pagination-item-active") as HTMLElement | null;
    if (activeItem) {
      let sibling = activeItem.nextElementSibling as HTMLElement | null;
      while (sibling) {
        const cls = String(sibling.className || "");
        if (/ant-pagination-item/.test(cls) && !/disabled/i.test(cls) && !isDisabled(sibling)) {
          const target = (sibling.querySelector("a") as HTMLElement | null) || sibling;
          target.click();
          return true;
        }
        sibling = sibling.nextElementSibling as HTMLElement | null;
      }
    }

    return false;
  });
};

const collectListRowsAcrossPages = async (
  page: any,
  targetUrl: string,
  captures: CapturedResponse[],
  startCapture: number,
  expectedTotalCount: number | null = null,
  maxPages: number = 200
) => {
  const mergedRows: any[] = [];
  const seen = new Set<string>();
  let desiredPages = maxPages;

  const appendRows = (rows: any[]) => {
    for (const row of rows) {
      const key = getRowIdentity(row);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      mergedRows.push(row);
    }
  };

  const readCurrentPayload = () => {
    return pickListPayload(targetUrl, captures.slice(startCapture));
  };

  const readCurrentRows = () => {
    const payload = readCurrentPayload();
    return pickRows(payload);
  };

  const syncDesiredPages = () => {
    const payload = readCurrentPayload();
    const rows = pickRows(payload);
    const payloadTotal = pickTotalCount(payload, rows);
    const total = Math.max(payloadTotal, expectedTotalCount || 0);
    if (rows.length > 0 && total > rows.length) {
      const estimated = Math.ceil(total / rows.length);
      desiredPages = Math.min(Math.max(desiredPages, estimated), 500);
    }
  };

  syncDesiredPages();
  appendRows(readCurrentRows());

  for (let i = 0; i < desiredPages; i++) {
    const hasNext = await clickListNextPage(page);
    if (!hasNext) break;

    await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    syncDesiredPages();

    const before = seen.size;
    appendRows(readCurrentRows());
    if (seen.size === before) {
      break;
    }
  }

  return mergedRows;
};

const probeSingleTarget = async (
  page: any,
  targetUrl: string,
  captures: CapturedResponse[]
): Promise<DosoProbeTargetResult> => {
  const base: DosoProbeTargetResult = {
    url: targetUrl,
    title: "",
    list_ok: false,
    total_count: 0,
    estimated_sessions: 0,
    samples: [],
    detail_ok: false,
    detail_fields_presence: {
      title: false,
      price: false,
      images: false,
      description: false,
      specs: false,
    },
  };

  try {
    const start = captures.length;
    await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(1500);

    const title = await page.title();
    const domDetailLinks: string[] = await page.evaluate(() => {
      const links = Array.from(
        document.querySelectorAll('a[href*="DetailPage"],a[href*="detailPage"],a[href*="detail"]')
      )
        .map((a) => (a as HTMLAnchorElement).href)
        .filter(Boolean);
      return Array.from(new Set(links)).slice(0, 20);
    });

    const localCaptures = captures.slice(start);
    const listPayload = pickListPayload(targetUrl, localCaptures);
    const domOverallTotal = await extractDomOverallTotal(page);

    const samples = parseSamples(listPayload).map((s) => ({
      ...s,
      detail_url: s.detail_url || inferDetailUrl(targetUrl, s.id),
    }));

    const rows = pickRows(listPayload);
    const totalCount = Math.max(pickTotalCount(listPayload, rows), domOverallTotal || 0);
    const estimatedSessions = totalCount > 0 ? Math.ceil(totalCount / IMPORT_BATCH_SIZE) : 0;

    const detailCandidate = samples.find((s) => s.detail_url)?.detail_url || domDetailLinks[0] || null;
    const detailInfo = await probeDetail(page, detailCandidate);

    return {
      ...base,
      title,
      list_ok: Boolean(listPayload && (listPayload.code === 0 || totalCount > 0)),
      total_count: totalCount,
      estimated_sessions: estimatedSessions,
      samples,
      detail_ok: detailInfo.detail_ok,
      detail_fields_presence: detailInfo.detail_fields_presence,
    };
  } catch (err) {
    return {
      ...base,
      error: err instanceof Error ? err.message : "probe target failed",
    };
  }
};

const loginToybox = async (page: any, username: string, password: string) => {
  await page.goto(TOYBOX_LOGIN_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.locator('input[name="id"]').first().fill(username);
  await page.locator('input[name="passwd"]').first().fill(password);

  const submitByLink = page.locator('a[href*="check_log"]');
  if ((await submitByLink.count()) > 0) {
    await submitByLink.first().click();
  } else {
    await page.keyboard.press("Enter");
  }

  await page.waitForTimeout(2500);
  if (page.url().includes("member.html?type=login")) {
    return false;
  }
  return true;
};

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

const normalizeToyboxCategoryId = (input: { xcode?: string | null; mcode?: string | null; scode?: string | null }) => {
  const x = String(input.xcode || "").trim();
  const m = String(input.mcode || "").trim();
  const s = String(input.scode || "").trim();
  if (!x) return null;
  if (s) return `toybox:x${x}:m${m || "0"}:s${s}`;
  if (m) return `toybox:x${x}:m${m}`;
  return `toybox:x${x}`;
};

const parseWonNumber = (raw: string | null | undefined) => {
  if (!raw) return null;
  const normalized = raw.replace(/[^\d]/g, "");
  if (!normalized) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
};

const wonToTwd = (krw: number | null | undefined) => {
  if (typeof krw !== "number" || !Number.isFinite(krw) || krw <= 0) return null;
  return Math.round(krw * KRW_TO_TWD_RATE);
};

const extractKidsVillageCodeFromUrl = (rawUrl: string, fallback?: string) => {
  try {
    const u = new URL(rawUrl);
    const itId = u.searchParams.get("it_id");
    if (itId) return `kv-${itId}`;
  } catch {
    // noop
  }
  return fallback || `kv-${Date.now()}`;
};

const collectKidsVillageListRowsFromCurrentPage = async (page: any): Promise<KidsVillageListRow[]> => {
  return await page.evaluate(() => {
    const clean = (value: string | null | undefined) => String(value || "").replace(/\s+/g, " ").trim();
    const absolute = (href: string | null | undefined) => {
      try {
        return href ? new URL(href, location.href).toString() : null;
      } catch {
        return null;
      }
    };
    const getQueryParam = (rawUrl: string | null | undefined, key: string) => {
      if (!rawUrl) return null;
      try {
        return new URL(rawUrl, location.href).searchParams.get(key);
      } catch {
        return null;
      }
    };
    const sourceCategoryLink = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('a[href*="/shop/list.php?ca_id="]')
    ).find((a) => a.classList.contains("on"));
    const sourceBrandLink = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('a[href*="/shop/brand.php"][href*="br_id="]')
    ).find((a) => a.classList.contains("on"));
    const sourceCategoryId = sourceCategoryLink
      ? new URL(sourceCategoryLink.href, location.href).searchParams.get("ca_id")
      : new URL(location.href).searchParams.get("ca_id");
    const sourceBrandId = sourceBrandLink
      ? new URL(sourceBrandLink.href, location.href).searchParams.get("br_id")
      : new URL(location.href).searchParams.get("br_id");
    const seen = new Set<string>();

    return Array.from(document.querySelectorAll<HTMLElement>('[id^="cart_good_zone_"]'))
      .flatMap((card) => {
        const titleLink = Array.from(card.querySelectorAll<HTMLAnchorElement>('.Bottom_Box a[href*="/shop/item.php?it_id="]')).find(
          (link) => clean(link.textContent || "")
        );
        const detailLink =
          titleLink ||
          card.querySelector<HTMLAnchorElement>('a.sct_a[href*="/shop/item.php?it_id="]') ||
          card.querySelector<HTMLAnchorElement>('a[href*="/shop/item.php?it_id="]');
        const detailUrl = absolute(detailLink?.getAttribute("href") || null);
        const image = card.querySelector<HTMLImageElement>('.sct_img img[src*="/data/item/"]');
        const brandLink = card.querySelector<HTMLAnchorElement>('.Top_Box li:first-child a[href*="/shop/brand.php"]');
        const detailBrandId = getQueryParam(detailUrl, "br_id");
        const cardBrandId = getQueryParam(brandLink?.getAttribute("href") || brandLink?.href || null, "br_id");
        const detailCategoryId = getQueryParam(detailUrl, "ca_id");

        if (sourceBrandId && detailBrandId !== sourceBrandId && cardBrandId !== sourceBrandId) {
          return [];
        }

        if (!sourceBrandId && sourceCategoryId && detailCategoryId && detailCategoryId !== sourceCategoryId) {
          return [];
        }

        const sourceName = clean(
          sourceCategoryLink?.textContent ||
            sourceBrandLink?.textContent ||
            (sourceBrandId ? brandLink?.textContent : "") ||
            document.querySelector("h2,h3")?.textContent ||
            "Kids Village"
        );
        return [
          {
            title: clean(titleLink?.textContent || detailLink?.textContent || image?.alt || ""),
            detailUrl,
            image: absolute(image?.getAttribute("src") || null),
            sourceCategoryId: sourceCategoryId
              ? `kidsvillage:category:${sourceCategoryId}`
              : sourceBrandId
                ? `kidsvillage:brand:${sourceBrandId}`
                : null,
            sourceCategoryName: sourceName,
          },
        ];
      })
      .filter((row) => row.detailUrl && !seen.has(row.detailUrl) && seen.add(row.detailUrl));
  });
};

const collectKidsVillageListRows = async (
  page: any,
  targetUrl: string,
  options?: { waitUntil?: "domcontentloaded" | "networkidle"; includeNextPages?: boolean }
): Promise<KidsVillageListRow[]> => {
  const rows: KidsVillageListRow[] = [];
  const visitedProducts = new Set<string>();
  const visitedPages = new Set<string>();
  let nextUrl: string | null = targetUrl;
  const waitUntil = options?.waitUntil || "networkidle";
  const includeNextPages = options?.includeNextPages ?? true;

  while (nextUrl && rows.length < MAX_IMPORT_ROWS_PER_TARGET) {
    if (visitedPages.has(nextUrl)) break;
    visitedPages.add(nextUrl);

    await page.goto(nextUrl, { waitUntil, timeout: 45000 });
    const currentRows = await collectKidsVillageListRowsFromCurrentPage(page);
    for (const row of currentRows) {
      if (!row.detailUrl || visitedProducts.has(row.detailUrl)) continue;
      visitedProducts.add(row.detailUrl);
      rows.push(row);
      if (rows.length >= MAX_IMPORT_ROWS_PER_TARGET) break;
    }

    if (rows.length >= MAX_IMPORT_ROWS_PER_TARGET) break;

    nextUrl = includeNextPages ? await getNextKidsVillagePageUrlFromCurrentPage(page) : null;
  }

  return rows;
};

const prepareKidsVillageListPage = async (context: any) => {
  const listPage = await context.newPage();
  await listPage.route("**/*", async (route: any) => {
    const type = route.request().resourceType();
    if (type === "image" || type === "media" || type === "font" || type === "stylesheet") {
      await route.abort();
      return;
    }
    await route.continue();
  });
  return listPage;
};

const getNextKidsVillagePageUrlFromCurrentPage = async (page: any): Promise<string | null> => {
  return await page.evaluate(() => {
    const current = new URL(location.href);
    const currentPage = Number(current.searchParams.get("page") || "1");
    const candidates = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="page="]'))
      .map((a) => {
        try {
          const url = new URL(a.href, location.href);
          const pageNo = Number(url.searchParams.get("page") || "");
          const text = String(a.textContent || "").replace(/\s+/g, " ").trim();
          return Number.isFinite(pageNo) && pageNo > currentPage
            ? { href: url.toString(), pageNo, text }
            : null;
        } catch {
          return null;
        }
      })
      .filter((item): item is { href: string; pageNo: number; text: string } => Boolean(item));

    if (candidates.length === 0) {
      return null;
    }

    const prioritized = candidates
      .sort((a, b) => a.pageNo - b.pageNo)
      .find((item) => /다음|next|페이지|page/i.test(item.text));

    return (prioritized || candidates[0])?.href || null;
  });
};

const collectToyboxListRowsFromCurrentPage = async (page: any) => {
  const rawRows = (await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href*="/shop/shopdetail.html"]'));
    return anchors.map((anchor) => {
      const a = anchor as HTMLAnchorElement;
      const href = a.getAttribute("href") || "";
      const img = a.querySelector("img") as HTMLImageElement | null;
      const card = a.closest("li, td, div") as HTMLElement | null;
      const cardText = (card?.textContent || a.textContent || "").replace(/\s+/g, " ").trim();
      return {
        href,
        title: (img?.alt || a.getAttribute("title") || "").trim(),
        image: img?.src || "",
        text: cardText,
      };
    });
  })) as Array<{ href: string; title: string; image: string; text: string }>;

  const currentUrl = page.url();
  const mapped = rawRows
    .map((row) => {
      const detailUrl = toAbsoluteUrl(currentUrl, row.href);
      if (!detailUrl) return null;
      const fallbackTitle = row.text.split("입수량")[0]?.trim() || row.text.slice(0, 80);
      const amounts = Array.from(row.text.matchAll(/([0-9][0-9,]{2,})\s*원/g)).map((m) => parseWonNumber(m[1]));
      const validAmounts = amounts.filter((n): n is number => Boolean(n));
      const wholesale = validAmounts.length >= 2 ? Math.min(validAmounts[0], validAmounts[1]) : validAmounts[0] || null;

      const sourceCategoryId = (() => {
        try {
          const u = new URL(detailUrl);
          return normalizeToyboxCategoryId({
            xcode: u.searchParams.get("xcode"),
            mcode: u.searchParams.get("mcode"),
            scode: u.searchParams.get("scode"),
          });
        } catch {
          return null;
        }
      })();

      return {
        detailUrl,
        title: row.title || fallbackTitle || "",
        image: row.image || "",
        wholesalePriceKRW: wholesale,
        sourceCategoryId,
      };
    })
    .filter((x): x is { detailUrl: string; title: string; image: string; wholesalePriceKRW: number | null; sourceCategoryId: string | null } => Boolean(x));

  return mapped;
};

const collectToyboxListRows = async (page: any, targetUrl: string) => {
  await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(1200);
  const dedup = new Map<string, { detailUrl: string; title: string; image: string; wholesalePriceKRW: number | null; sourceCategoryId: string | null }>();

  const rows = await collectToyboxListRowsFromCurrentPage(page);
  for (const row of rows) {
    if (!dedup.has(row.detailUrl)) {
      dedup.set(row.detailUrl, row);
    }
    if (dedup.size >= MAX_IMPORT_ROWS_PER_TARGET) break;
  }

  return Array.from(dedup.values());
};

const scrapeToyboxDetail = async (page: any, detailUrl: string) => {
  await page.goto(detailUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(1000);

  const detail = await page.evaluate(() => {
    const pageTitle = document.title || "";
    const title =
      (document.querySelector("h2")?.textContent ||
        document.querySelector("h3")?.textContent ||
        document.querySelector(".name")?.textContent ||
        document.querySelector(".headingArea h2")?.textContent ||
        document.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
        pageTitle.replace(/^toytop\s*-\s*/i, "") ||
        "")
        .trim();

    const descNode =
      document.querySelector("#prdDetail") ||
      document.querySelector("#productDetail") ||
      document.querySelector(".MS_product_detail") ||
      document.querySelector(".detail");

    const description = (descNode?.textContent || "").trim();
    const images = Array.from(
      document.querySelectorAll('#objImg img, .productimg img, #prdDetail img, #productDetail img, img[src*="shopimages"]')
    )
      .map((img) => (img as HTMLImageElement).src)
      .filter(Boolean);

    const consumerPriceText =
      document.querySelector(".table-opt td.price")?.textContent ||
      document.querySelector("td.price")?.textContent ||
      "";
    const sellPriceText =
      document.querySelector(".table-opt td.price.sell_price")?.textContent ||
      document.querySelector("td.sell_price")?.textContent ||
      "";

    const breadcrumb = Array.from(document.querySelectorAll('a[href*="shopbrand.html"]'))
      .map((a) => {
        const link = a as HTMLAnchorElement;
        return {
          href: link.href,
          text: (link.textContent || "").trim(),
        };
      })
      .filter((x) => x.text);

    return {
      title,
      description,
      images: Array.from(new Set(images)),
      consumerPriceText,
      sellPriceText,
      breadcrumb,
    };
  });

  return detail;
};

const scrapeKidsVillageDetail = async (page: any, detailUrl: string) => {
  await page.goto(detailUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
  const currentUrl = page.url();
  if (/register\.php|login\.php/.test(currentUrl)) {
    throw new Error("Kids Village 商品詳情需要登入後才能讀取");
  }

  let detailItemId = "";
  try {
    detailItemId = new URL(currentUrl).searchParams.get("it_id") || "";
  } catch {
    detailItemId = "";
  }

  return await page.evaluate((itemId: string) => {
    const clean = (value: string | null | undefined) => String(value || "").replace(/\s+/g, " ").trim();
    const absolute = (value: string | null | undefined) => {
      try {
        return value ? new URL(value, location.href).toString() : null;
      } catch {
        return null;
      }
    };
    const isCurrentItemImage = (url: string) => {
      if (!url) return false;
      if (/\/shop\/img\/no_image\.gif$/i.test(url)) return false;
      if (!itemId) return true;
      return url.includes(`/data/item/${itemId}/`) || url.includes(`/${itemId}/`);
    };
    const parsePrice = (text: string) => {
      const normalized = text.replace(/,/g, "");
      const match = normalized.match(/(\d{3,})\s*원/);
      return match ? Number(match[1]) : null;
    };
    const title = clean(document.querySelector<HTMLElement>("#sit_title")?.textContent || "");
    const bodyText = clean(document.body.textContent || "");
    const priceInput = document.querySelector<HTMLInputElement>("#it_price")?.value || "";
    const priceRowText = Array.from(document.querySelectorAll<HTMLTableRowElement>("#sit_ov .sit_ov_tbl tr"))
      .map((row) => {
        const th = clean(row.querySelector("th")?.textContent || "");
        const td = clean(row.querySelector("td")?.textContent || "");
        return { th, td };
      })
      .find((row) => row.th === "공급가격");
    const price = Number(priceInput || "") || parsePrice(priceRowText?.td || bodyText);
    const readImageUrl = (img: HTMLImageElement) => {
      const direct = img.getAttribute("src") || "";
      const lazy = img.getAttribute("data-src") || img.getAttribute("data-original") || "";
      return absolute(direct || lazy || null);
    };
    const mainImages = Array.from(document.querySelectorAll<HTMLImageElement>("#sit_pvi img"))
      .map((img) => readImageUrl(img))
      .filter((src): src is string => {
        if (!src) return false;
        return isCurrentItemImage(src);
      });
    const descriptionImages = Array.from(document.querySelectorAll<HTMLImageElement>("#sit_inf_explan img"))
      .map((img) => readImageUrl(img))
      .filter((src): src is string => {
        if (!src) return false;
        return isCurrentItemImage(src);
      });
    const descriptionRoot = document.querySelector<HTMLElement>("#sit_inf_explan");
    const descriptionText = clean(descriptionRoot?.innerText || "");
    const descriptionHtml = descriptionRoot?.innerHTML || "";
    const brandRow = Array.from(document.querySelectorAll<HTMLTableRowElement>("#sit_ov .sit_ov_tbl tr"))
      .map((row) => ({
        th: clean(row.querySelector("th")?.textContent || ""),
        td: clean(row.querySelector("td")?.textContent || ""),
      }))
      .find((row) => row.th === "브랜드");

    return {
      title,
      brand: brandRow?.td || "",
      price_krw: typeof price === "number" && Number.isFinite(price) && price > 0 ? price : null,
      images: Array.from(new Set([...mainImages, ...descriptionImages])),
      description: descriptionText,
      descriptionHtml,
    };
  }, detailItemId);
};

const probeSingleToyboxTarget = async (
  page: any,
  targetUrl: string
): Promise<DosoProbeTargetResult> => {
  const base: DosoProbeTargetResult = {
    url: targetUrl,
    title: "",
    list_ok: false,
    total_count: 0,
    estimated_sessions: 0,
    samples: [],
    detail_ok: false,
    detail_fields_presence: {
      title: false,
      price: false,
      images: false,
      description: false,
      specs: false,
    },
  };

  try {
    await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 45000 });
    const title = await page.title();
    const rows = await collectToyboxListRows(page, targetUrl);
    const sampleRows = rows.slice(0, 5);

    let detailPresence = {
      title: false,
      price: false,
      images: false,
      description: false,
      specs: false,
    };

    if (sampleRows.length > 0) {
      const detail = await scrapeToyboxDetail(page, sampleRows[0].detailUrl);
      detailPresence = {
        title: Boolean(detail.title),
        price: Boolean(parseWonNumber(detail.sellPriceText) || parseWonNumber(detail.consumerPriceText)),
        images: Array.isArray(detail.images) && detail.images.length > 0,
        description: Boolean(detail.description),
        specs: false,
      };
    }

    return {
      ...base,
      title,
      list_ok: rows.length > 0,
      total_count: rows.length,
      estimated_sessions: rows.length > 0 ? Math.ceil(rows.length / IMPORT_BATCH_SIZE) : 0,
      samples: sampleRows.map((row, idx) => ({
        id: extractToyboxCodeFromUrl(row.detailUrl, `tb-sample-${idx + 1}`),
        title: row.title || "",
        detail_url: row.detailUrl,
      })),
      detail_ok: sampleRows.length > 0,
      detail_fields_presence: detailPresence,
    };
  } catch (err) {
    return {
      ...base,
      error: err instanceof Error ? err.message : "probe target failed",
    };
  }
};

const probeSingleKidsVillageTarget = async (
  page: any,
  targetUrl: string
): Promise<DosoProbeTargetResult> => {
  try {
    await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 45000 });
    const title = (await page.title().catch(() => "")) || "Kids Village";
    const rows = await collectKidsVillageListRows(page, targetUrl);
    const sampleRows = rows.slice(0, 3);
    let detailFields = { title: false, price: false, images: false, description: false, specs: false };
    if (sampleRows[0]?.detailUrl) {
      const detail = await scrapeKidsVillageDetail(page, sampleRows[0].detailUrl);
      detailFields = {
        title: Boolean(detail.title),
        price: Boolean(detail.price_krw),
        images: detail.images.length > 0,
        description: Boolean(detail.description || detail.descriptionHtml),
        specs: false,
      };
    }
    return {
      url: targetUrl,
      title,
      list_ok: rows.length > 0,
      total_count: rows.length,
      estimated_sessions: rows.length > 0 ? Math.ceil(rows.length / IMPORT_BATCH_SIZE) : 0,
      samples: sampleRows.map((row, idx) => ({
        id: extractKidsVillageCodeFromUrl(row.detailUrl, `kv-sample-${idx + 1}`),
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

const runToyboxImportPreview = async (
  page: any,
  targets: string[],
  includeDetails: boolean
) => {
  const products: DosoImportProduct[] = [];
  const targetResults: DosoImportTargetResult[] = [];

  for (const target of targets) {
    try {
      const rows = await collectToyboxListRows(page, target);
      const mapped: DosoImportProduct[] = [];

      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
          const code = extractToyboxCodeFromUrl(row.detailUrl, `tb-${i + 1}`);

        let title = row.title || code;
        let description = "";
        let images: string[] = row.image ? [row.image] : [];
        let wholesalePriceKRW = row.wholesalePriceKRW;
        let sourceCategoryName: string | null = null;

        if (includeDetails) {
          const detail = await scrapeToyboxDetail(page, row.detailUrl);
          title = detail.title || title;
          description = detail.description || "";
          images = detail.images.length > 0 ? detail.images : images;
          const sellPrice = parseWonNumber(detail.sellPriceText);
          wholesalePriceKRW = sellPrice || wholesalePriceKRW;
          const categoryTrail = detail.breadcrumb
            ?.map((item: { text: string }) => item.text)
            .filter(Boolean)
            .slice(-2)
            .join(" > ");
          sourceCategoryName = categoryTrail || null;
        }

        mapped.push({
          productCode: code,
          title,
          description,
          url: row.detailUrl,
          images,
          wholesalePriceTWD: wonToTwd(wholesalePriceKRW),
          sourceDirectoryUrl: target,
          sourceCategoryId: row.sourceCategoryId,
          sourceCategoryName,
        });
      }

      products.push(...mapped);
      targetResults.push({ url: target, title: await page.title(), count: mapped.length });
    } catch (err) {
      targetResults.push({
        url: target,
        title: "",
        count: 0,
        error: err instanceof Error ? err.message : "target import preview failed",
      });
    }
  }

  const dedup = new Map<string, DosoImportProduct>();
  for (const p of products) {
    dedup.set(p.productCode, p);
  }

  return {
    login_ok: true,
    products: Array.from(dedup.values()),
    targets: targetResults,
  } satisfies DosoImportResponse;
};

const runKidsVillageImportPreview = async (
  page: any,
  targets: string[],
  includeDetails: boolean
) => {
  const products: DosoImportProduct[] = [];
  const targetResults: DosoImportTargetResult[] = [];
  const listPage = includeDetails ? null : await prepareKidsVillageListPage(page.context());

  try {
    for (const target of targets) {
      try {
        const activePage = listPage || page;
        await activePage.goto(target, {
          waitUntil: "domcontentloaded",
          timeout: 45000,
        });
        const title = (await activePage.title().catch(() => "")) || "Kids Village";
        const rows = await collectKidsVillageListRows(activePage, target, {
          waitUntil: "domcontentloaded",
          includeNextPages: false,
        });
        const mapped: DosoImportProduct[] = [];

        for (let i = 0; i < rows.length; i += 1) {
          const row = rows[i];
          const code = extractKidsVillageCodeFromUrl(row.detailUrl, `kv-${i + 1}`);
          let titleValue = row.title || code;
          let description = "";
          let images: string[] = row.image ? [row.image] : [];
          let wholesalePriceTWD: number | null | undefined = undefined;

          if (includeDetails) {
            const detail = await scrapeKidsVillageDetail(page, row.detailUrl);
            titleValue = detail.title || titleValue;
            description = detail.descriptionHtml || detail.description || "";
            images = detail.images.length > 0 ? detail.images : images;
            const priceTwd = wonToTwd(detail.price_krw);
            wholesalePriceTWD = priceTwd;
          }

          mapped.push({
            productCode: code,
            title: titleValue,
            description,
            url: row.detailUrl,
            images,
            wholesalePriceTWD,
            sourceDirectoryUrl: target,
            sourceCategoryId: row.sourceCategoryId,
            sourceCategoryName: row.sourceCategoryName || null,
          });
        }

        products.push(...mapped);
        targetResults.push({ url: target, title, count: mapped.length });
      } catch (err) {
        targetResults.push({
          url: target,
          title: "Kids Village",
          count: 0,
          error: err instanceof Error ? err.message : "Kids Village target import preview failed",
        });
      }
    }

    const dedup = new Map<string, DosoImportProduct>();
    for (const p of products) {
      dedup.set(p.productCode, p);
    }

    return {
      login_ok: true,
      products: Array.from(dedup.values()),
      targets: targetResults,
    } satisfies DosoImportResponse;
  } finally {
    if (listPage) {
      await listPage.close().catch(() => null);
    }
  }
};

export async function runDosoProbe(input: {
  username: string;
  password: string;
  targets?: string[];
}): Promise<DosoProbeResponse> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const captures: CapturedResponse[] = [];

  page.on("response", async (resp) => {
    try {
      const url = resp.url();
      if (!url.includes("/mydoso/")) return;
      const body = await resp.text();
      if (!safeJson(body)) return;
      captures.push({ url, body });
    } catch {
      // noop
    }
  });

  try {
    const targets = (input.targets && input.targets.length > 0 ? input.targets : DEFAULT_DOSO_TARGETS).slice(0, 20);
    const allToybox = targets.length > 0 && targets.every((target) => isToyboxUrl(target));
    const allKidsVillage = targets.length > 0 && targets.every((target) => isKidsVillageUrl(target));

    if (allToybox) {
      const loginOk = await loginToybox(page, input.username, input.password);
      if (!loginOk) {
        return {
          login_ok: false,
          targets: [],
          error: "登入失敗，用戶名稱或密碼錯誤",
        };
      }

      const results: DosoProbeTargetResult[] = [];
      for (const target of targets) {
        results.push(await probeSingleToyboxTarget(page, target));
      }

      return {
        login_ok: true,
        targets: results,
      };
    }

    if (allKidsVillage) {
      const loginOk = await loginKidsVillage(page, input.username, input.password);
      if (!loginOk) {
        return {
          login_ok: false,
          targets: [],
          error: "Kids Village 登入失敗，用戶名稱或密碼錯誤",
        };
      }

      const results: DosoProbeTargetResult[] = [];
      for (const target of targets) {
        results.push(await probeSingleKidsVillageTarget(page, target));
      }

      return {
        login_ok: true,
        targets: results,
      };
    }

    await page.goto(LOGIN_URL, { waitUntil: "networkidle", timeout: 45000 });
    await page.getByPlaceholder("請輸入用戶名").fill(input.username);
    await page.getByPlaceholder("密碼").fill(input.password);
    await page.getByRole("button", { name: /login/i }).click();
    await page.waitForTimeout(2500);

    const currentUrl = page.url();
    if (currentUrl.includes("/auth/login")) {
      return {
        login_ok: false,
        targets: [],
        error: "登入失敗，用戶名稱或密碼錯誤",
      };
    }

    const results: DosoProbeTargetResult[] = [];

    for (const target of targets) {
      const row = await probeSingleTarget(page, target, captures);
      results.push(row);
    }

    return {
      login_ok: true,
      targets: results,
    };
  } catch (err) {
    return {
      login_ok: false,
      targets: [],
      error: err instanceof Error ? err.message : "probe failed",
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

export async function runDosoImportPreview(input: {
  username: string;
  password: string;
  targets?: string[];
  includeDetails?: boolean;
}): Promise<DosoImportResponse> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const captures: CapturedResponse[] = [];

  page.on("response", async (resp) => {
    try {
      const url = resp.url();
      if (!url.includes("/mydoso/")) return;
      const body = await resp.text();
      if (!safeJson(body)) return;
      captures.push({ url, body });
    } catch {
      // noop
    }
  });

  try {
    const targets = (input.targets && input.targets.length > 0 ? input.targets : DEFAULT_DOSO_TARGETS).slice(0, 20);
    const includeDetails = input.includeDetails !== false;
    const allToybox = targets.length > 0 && targets.every((target) => isToyboxUrl(target));
    const allKidsVillage = targets.length > 0 && targets.every((target) => isKidsVillageUrl(target));

    if (allToybox) {
      const loginOk = await loginToybox(page, input.username, input.password);
      if (!loginOk) {
        return {
          login_ok: false,
          products: [],
          targets: [],
          error: "登入失敗，用戶名稱或密碼錯誤",
        };
      }

      return await runToyboxImportPreview(page, targets, includeDetails);
    }

    if (allKidsVillage) {
      const loginOk = await loginKidsVillage(page, input.username, input.password);
      if (!loginOk) {
        return {
          login_ok: false,
          products: [],
          targets: [],
          error: "Kids Village 登入失敗，用戶名稱或密碼錯誤",
        };
      }

      return await runKidsVillageImportPreview(page, targets, includeDetails);
    }

    await page.goto(LOGIN_URL, { waitUntil: "networkidle", timeout: 45000 });
    await page.getByPlaceholder("請輸入用戶名").fill(input.username);
    await page.getByPlaceholder("密碼").fill(input.password);
    await page.getByRole("button", { name: /login/i }).click();
    await page.waitForTimeout(2500);

    if (page.url().includes("/auth/login")) {
      return {
        login_ok: false,
        products: [],
        targets: [],
        error: "登入失敗，用戶名稱或密碼錯誤",
      };
    }

    const products: DosoImportProduct[] = [];
    const targetResults: DosoImportTargetResult[] = [];

    for (const target of targets) {
      try {
        const start = captures.length;
        await page.goto(target, { waitUntil: "networkidle", timeout: 45000 });
        await page.waitForTimeout(1500);

        const title = await page.title();
        const localCaptures = captures.slice(start);
        const listPayload = pickListPayload(target, localCaptures);
        const domOverallTotal = await extractDomOverallTotal(page);
        const rowsFromApi = await fetchCatalogRowsViaApi(context, page, target);
        const rowsFromPages =
          rowsFromApi.length > 0
            ? rowsFromApi
            : await collectListRowsAcrossPages(page, target, captures, start, domOverallTotal);
        const rows = rowsFromPages.length > 0 ? rowsFromPages : pickRows(listPayload);

        const mapped = rows
          .slice(0, MAX_IMPORT_ROWS_PER_TARGET)
          .map((row: any) => mapRowToImportProduct(target, row))
          .filter((x: DosoImportProduct | null): x is DosoImportProduct => Boolean(x));

        const enriched = includeDetails
          ? await enrichProductsWithDetails(context, page, target, mapped)
          : mapped;

        products.push(...enriched);
        targetResults.push({ url: target, title, count: enriched.length });
      } catch (err) {
        targetResults.push({
          url: target,
          title: "",
          count: 0,
          error: err instanceof Error ? err.message : "target import preview failed",
        });
      }
    }

    const dedup = new Map<string, DosoImportProduct>();
    for (const p of products) {
      dedup.set(p.productCode, p);
    }

    return {
      login_ok: true,
      products: Array.from(dedup.values()),
      targets: targetResults,
    };
  } catch (err) {
    return {
      login_ok: false,
      products: [],
      targets: [],
      error: err instanceof Error ? err.message : "import preview failed",
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

const flattenCategoryNodes = (
  value: any,
  directoryUrl: string,
  parentId: string | null = null,
  level = 1,
  out: DosoSourceCategoryNode[] = []
) => {
  if (Array.isArray(value)) {
    for (const row of value) {
      flattenCategoryNodes(row, directoryUrl, parentId, level, out);
    }
    return out;
  }

  if (!value || typeof value !== "object") {
    return out;
  }

  const hasName =
    typeof value.name === "string" ||
    typeof value.name_tw === "string" ||
    typeof value.label === "string" ||
    typeof value.title === "string";
  const rawId =
    value.site_id ??
    value.id ??
    value.category_id ??
    value.cid ??
    value.code ??
    null;
  const nodeId = String(rawId ?? "").trim();

  if (hasName && nodeId) {
    const nodeParent =
      value.parent_id !== undefined && value.parent_id !== null
        ? String(value.parent_id)
        : value.pid !== undefined && value.pid !== null
          ? String(value.pid)
          : parentId;

    out.push({
      source_category_id: nodeId,
      name: String(value.name_tw ?? value.name ?? value.label ?? value.title ?? "").trim(),
      parent_id: nodeParent && nodeParent !== "0" ? nodeParent : null,
      level,
      directory_url: directoryUrl,
    });
  }

  const children =
    value.children ?? value.childrens ?? value.child ?? value.list ?? value.items ?? value.sub_category;
  if (Array.isArray(children) && children.length > 0) {
    flattenCategoryNodes(children, directoryUrl, nodeId || parentId, level + 1, out);
  }

  return out;
};

const dedupCategoryNodes = (nodes: DosoSourceCategoryNode[]) => {
  const map = new Map<string, DosoSourceCategoryNode>();
  for (const node of nodes) {
    const key = `${node.directory_url}::${node.source_category_id}`;
    if (!map.has(key)) {
      map.set(key, node);
    }
  }
  return Array.from(map.values());
};

const extractSourceCategoriesFromSessionStorage = async (page: any, directoryUrl: string) => {
  const raw = await page.evaluate(() => {
    const out: Array<{ key: string; value: any }> = [];
    const keys = Object.keys(sessionStorage);
    for (const key of keys) {
      if (!/category|cate/i.test(key)) continue;
      try {
        const text = sessionStorage.getItem(key);
        if (!text) continue;
        const json = JSON.parse(text);
        out.push({ key, value: json });
      } catch {
        // noop
      }
    }
    return out;
  });

  const nodes: DosoSourceCategoryNode[] = [];
  for (const entry of raw as Array<{ key: string; value: any }>) {
    const value = entry.value;
    if (Array.isArray(value)) {
      flattenCategoryNodes(value, directoryUrl, null, 1, nodes);
    } else if (value && typeof value === "object") {
      const candidates = [
        value.categories,
        value.category,
        value.categoryTree,
        value.category_tree,
        value.data,
        value.rows,
        value.list,
        value.items,
        value.result,
      ];

      let parsed = false;
      for (const c of candidates) {
        if (Array.isArray(c) || (c && typeof c === "object")) {
          flattenCategoryNodes(c, directoryUrl, null, 1, nodes);
          parsed = true;
          break;
        }
      }

      if (!parsed) {
        flattenCategoryNodes(value, directoryUrl, null, 1, nodes);
      }
    }
  }

  return dedupCategoryNodes(nodes);
};

const extractToyboxSourceCategories = async (page: any, directoryUrl: string) => {
  const rows = (await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href*="shopbrand.html"]')).map((anchor) => {
      const a = anchor as HTMLAnchorElement;
      return {
        href: a.href,
        text: (a.textContent || "").replace(/\s+/g, " ").trim(),
      };
    });
  })) as Array<{ href: string; text: string }>;

  const nodes: DosoSourceCategoryNode[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    if (!row.text || !row.href) continue;
    try {
      const u = new URL(row.href);
      if (!/shopbrand\.html/i.test(u.pathname)) continue;
      const x = u.searchParams.get("xcode");
      const m = u.searchParams.get("mcode");
      const s = u.searchParams.get("scode");
      const sourceId = normalizeToyboxCategoryId({ xcode: x, mcode: m, scode: s });
      if (!sourceId) continue;
      const level = s ? 3 : m ? 2 : 1;
      const parentId = s
        ? normalizeToyboxCategoryId({ xcode: x, mcode: m })
        : m
          ? normalizeToyboxCategoryId({ xcode: x })
          : null;
      const key = `${directoryUrl}::${sourceId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      nodes.push({
        source_category_id: sourceId,
        name: row.text,
        parent_id: parentId,
        level,
        directory_url: directoryUrl,
      });
    } catch {
      // noop
    }
  }

  return nodes;
};

const extractKidsVillageSourceCategories = async (page: any, directoryUrl: string) => {
  await page.goto(directoryUrl, { waitUntil: "networkidle", timeout: 45000 });
  return await page.evaluate(() => {
    const clean = (value: string | null | undefined) => String(value || "").replace(/\s+/g, " ").trim();
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/shop/list.php?ca_id="]'));
    return links
      .map((a) => {
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
      })
      .filter((node) => node.source_category_id && node.name);
  });
};

export async function runDosoSourceCategoryRefresh(input: {
  username: string;
  password: string;
  targets?: string[];
}) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const targets = (input.targets && input.targets.length > 0 ? input.targets : DEFAULT_DOSO_TARGETS).slice(0, 20);
    const allToybox = targets.length > 0 && targets.every((target) => isToyboxUrl(target));
    const allKidsVillage = targets.length > 0 && targets.every((target) => isKidsVillageUrl(target));

    if (allToybox) {
      const loginOk = await loginToybox(page, input.username, input.password);
      if (!loginOk) {
        return {
          login_ok: false,
          directories: {},
          error: "登入失敗，用戶名稱或密碼錯誤",
        };
      }

      const directories: Record<string, DosoSourceCategoryNode[]> = {};
      for (const target of targets) {
        try {
          await page.goto(target, { waitUntil: "networkidle", timeout: 45000 });
          await page.waitForTimeout(1200);
          directories[target] = await extractToyboxSourceCategories(page, target);
        } catch {
          directories[target] = [];
        }
      }

      return {
        login_ok: true,
        directories,
      };
    }

    if (allKidsVillage) {
      const loginOk = await loginKidsVillage(page, input.username, input.password);
      if (!loginOk) {
        return {
          login_ok: false,
          directories: {},
          error: "Kids Village 登入失敗，用戶名稱或密碼錯誤",
        };
      }

      const directories: Record<string, DosoSourceCategoryNode[]> = {};
      for (const target of targets) {
        try {
          directories[target] = await extractKidsVillageSourceCategories(page, target);
        } catch {
          directories[target] = [];
        }
      }

      return {
        login_ok: true,
        directories,
      };
    }

    await page.goto(LOGIN_URL, { waitUntil: "networkidle", timeout: 45000 });
    await page.getByPlaceholder("請輸入用戶名").fill(input.username);
    await page.getByPlaceholder("密碼").fill(input.password);
    await page.getByRole("button", { name: /login/i }).click();
    await page.waitForTimeout(2500);

    if (page.url().includes("/auth/login")) {
      return {
        login_ok: false,
        directories: {},
        error: "登入失敗，用戶名稱或密碼錯誤",
      };
    }

    const directories: Record<string, DosoSourceCategoryNode[]> = {};

    for (const target of targets) {
      try {
        await page.goto(target, { waitUntil: "networkidle", timeout: 45000 });
        await page.waitForTimeout(1800);
        directories[target] = await extractSourceCategoriesFromSessionStorage(page, target);
      } catch {
        directories[target] = [];
      }
    }

    return {
      login_ok: true,
      directories,
    };
  } catch (err) {
    return {
      login_ok: false,
      directories: {},
      error: err instanceof Error ? err.message : "source category refresh failed",
    };
  } finally {
    await context.close();
    await browser.close();
  }
}
