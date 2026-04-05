import { chromium } from "playwright";
import { DEFAULT_DOSO_TARGETS } from "@/lib/doso/targets";
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
const MAX_IMPORT_ROWS_PER_TARGET = 20000;
const IMPORT_BATCH_SIZE = 20;

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

const clickListNextPage = async (page: any) => {
  return page.evaluate(() => {
    const selectors = [
      ".ant-pagination-next:not(.ant-pagination-disabled) button",
      ".ant-pagination-next:not(.ant-pagination-disabled)",
      ".pagination-next:not(.disabled)",
      "button[aria-label='Next Page']",
      "a[aria-label='Next Page']",
      "button[title='Next Page']",
      "button[title='下一頁']",
      "a[title='下一頁']",
    ];

    for (const selector of selectors) {
      const node = document.querySelector(selector) as HTMLElement | null;
      if (!node) continue;
      if (node.getAttribute("disabled") !== null) continue;
      node.click();
      return true;
    }

    const fallbackButtons = Array.from(document.querySelectorAll("button,a")) as HTMLElement[];
    const textHit = fallbackButtons.find((el) => {
      const t = (el.textContent || "").trim();
      if (!t) return false;
      if (!/下一頁|next/i.test(t)) return false;
      const cls = String(el.className || "");
      return !/disabled/i.test(cls) && el.getAttribute("disabled") === null;
    });
    if (textHit) {
      textHit.click();
      return true;
    }

    const activeItem = document.querySelector("li.ant-pagination-item-active") as HTMLElement | null;
    if (activeItem) {
      let sibling = activeItem.nextElementSibling as HTMLElement | null;
      while (sibling) {
        const cls = String(sibling.className || "");
        if (/ant-pagination-item/.test(cls) && !/disabled/i.test(cls)) {
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

    const targets = (input.targets && input.targets.length > 0 ? input.targets : DEFAULT_DOSO_TARGETS).slice(0, 20);
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

    const targets = (input.targets && input.targets.length > 0 ? input.targets : DEFAULT_DOSO_TARGETS).slice(0, 20);
    const includeDetails = input.includeDetails !== false;
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
        const rowsFromPages = await collectListRowsAcrossPages(page, target, captures, start, domOverallTotal);
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

export async function runDosoSourceCategoryRefresh(input: {
  username: string;
  password: string;
  targets?: string[];
}) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
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

    const targets = (input.targets && input.targets.length > 0 ? input.targets : DEFAULT_DOSO_TARGETS).slice(0, 20);
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
