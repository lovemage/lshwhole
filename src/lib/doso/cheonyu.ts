import type { DosoImportProduct } from "@/lib/doso/types";

const KRW_TO_TWD_RATE = 0.024;

export interface CheonyuListRowSnapshot {
  detailUrl: string;
  title: string;
  image?: string | null;
  priceText?: string | null;
  sourceCategoryId?: string | null;
  sourceCategoryName?: string | null;
}

export interface CheonyuDetailSnapshot {
  title: string;
  priceKRW: number | null;
  mainImages: string[];
  descriptionHtml: string;
  descriptionImages: string[];
}

const unique = (values: string[]) => Array.from(new Set(values.map((x) => x.trim()).filter(Boolean)));

const krwToTwd = (krw: number | null | undefined) => {
  if (typeof krw !== "number" || !Number.isFinite(krw) || krw <= 0) return null;
  return Math.round(krw * KRW_TO_TWD_RATE);
};

export const extractCheonyuProductCode = (rawUrl: string, fallback?: string) => {
  try {
    const u = new URL(rawUrl);
    const qidx = u.searchParams.get("qIDX") || u.searchParams.get("qidx");
    if (qidx && /^\d+$/.test(qidx)) return `cy-${qidx}`;
  } catch {
    // noop
  }
  return fallback || `cy-${Date.now()}`;
};

export const parseCheonyuPriceKRW = (raw: string | null | undefined) => {
  if (!raw) return null;
  const matches = Array.from(raw.matchAll(/([0-9][0-9,]*)\s*원/g))
    .map((match) => Number(match[1].replace(/,/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0);
  return matches.length > 0 ? Math.floor(matches[matches.length - 1]) : null;
};

export const mapCheonyuListRowToProduct = (
  targetUrl: string,
  row: CheonyuListRowSnapshot
): DosoImportProduct | null => {
  if (!row.detailUrl) return null;

  const productCode = extractCheonyuProductCode(row.detailUrl);
  const priceKRW = parseCheonyuPriceKRW(row.priceText || "");

  return {
    productCode,
    title: row.title || productCode,
    description: "",
    url: row.detailUrl,
    images: row.image ? [row.image] : [],
    wholesalePriceTWD: krwToTwd(priceKRW),
    wholesalePriceKRW: priceKRW,
    sourceDirectoryUrl: targetUrl,
    sourceCategoryId: row.sourceCategoryId || null,
    sourceCategoryName: row.sourceCategoryName || null,
  };
};

export const mergeCheonyuDetailIntoProduct = (
  product: DosoImportProduct,
  detail: CheonyuDetailSnapshot
): DosoImportProduct => {
  const priceKRW = detail.priceKRW ?? product.wholesalePriceKRW ?? null;
  return {
    ...product,
    title: detail.title || product.title,
    description: detail.descriptionHtml || product.description,
    images: unique([...product.images, ...detail.mainImages, ...detail.descriptionImages]),
    wholesalePriceTWD: krwToTwd(priceKRW) ?? product.wholesalePriceTWD,
    wholesalePriceKRW: priceKRW,
  };
};
