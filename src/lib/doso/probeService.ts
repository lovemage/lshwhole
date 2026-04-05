import { chromium } from "playwright";
import { DEFAULT_DOSO_TARGETS } from "@/lib/doso/targets";
import type {
  DosoImportProduct,
  DosoImportResponse,
  DosoImportTargetResult,
  DosoProbeResponse,
  DosoProbeTargetResult,
} from "@/lib/doso/types";

interface CapturedResponse {
  url: string;
  body: string;
}

const LOGIN_URL = "https://www.doso.net/auth/login";

const safeJson = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const pickRows = (payload: any): any[] => {
  const candidates = [
    payload?.result?.data,
    payload?.result?.list,
    payload?.result?.rows,
    payload?.result?.records,
    payload?.result?.items,
    payload?.data?.list,
    payload?.data?.rows,
    payload?.data?.records,
    payload?.data?.items,
    payload?.rows,
    payload?.records,
    payload?.list,
    payload?.items,
    payload?.result,
  ];

  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }

  return [];
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

  const mergedImages = Array.from(new Set([...product.images, ...collectImages(d)]));

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

const enrichProductsWithDetails = async (
  context: any,
  targetUrl: string,
  products: DosoImportProduct[]
): Promise<DosoImportProduct[]> => {
  const out: DosoImportProduct[] = [];

  for (const p of products) {
    const detail = await fetchDetailPayload(context, targetUrl, p.productCode);
    out.push(detail ? mergeDetailIntoProduct(p, detail) : p);
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

  const pattern = byPath[targetPath] || /getList|getEtonetRankingList/i;
  const hit = [...captures].reverse().find((x) => pattern.test(x.url));
  return hit ? safeJson(hit.body) : null;
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
    list_count_page: 0,
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

    const samples = parseSamples(listPayload).map((s) => ({
      ...s,
      detail_url: s.detail_url || inferDetailUrl(targetUrl, s.id),
    }));

    const listCount =
      pickRows(listPayload).length ||
      Number(
        listPayload?.result?.total ??
          listPayload?.result?.totalCount ??
          listPayload?.result?.count ??
          listPayload?.total ??
          0
      );

    const detailCandidate = samples.find((s) => s.detail_url)?.detail_url || domDetailLinks[0] || null;
    const detailInfo = await probeDetail(page, detailCandidate);

    return {
      ...base,
      title,
      list_ok: Boolean(listPayload && (listPayload.code === 0 || listCount > 0)),
      list_count_page: Number(listCount || 0),
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
      const ct = resp.headers()["content-type"] || "";
      if (!ct.includes("application/json")) return;
      const body = await resp.text();
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
}): Promise<DosoImportResponse> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const captures: CapturedResponse[] = [];

  page.on("response", async (resp) => {
    try {
      const url = resp.url();
      if (!url.includes("/mydoso/")) return;
      const ct = resp.headers()["content-type"] || "";
      if (!ct.includes("application/json")) return;
      const body = await resp.text();
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
        const rows = pickRows(listPayload);

        const mapped = rows
          .map((row: any) => mapRowToImportProduct(target, row))
          .filter((x: DosoImportProduct | null): x is DosoImportProduct => Boolean(x));

        const enriched = await enrichProductsWithDetails(context, target, mapped);

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
