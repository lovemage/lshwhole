export interface DosoCatalogListConfig {
  endpoint: string;
  method: "GET" | "POST";
  pageSize: number;
  buildPayload: (page: number, total: number, lastPage: number) => Record<string, any>;
  extractRows: (payload: any) => any[];
  extractTotal: (payload: any) => number;
  hasNextPage: (payload: any, rows: any[]) => boolean;
}

const toPositiveInt = (value: any) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

const selfOperatedMallConfig: DosoCatalogListConfig = {
  endpoint: "https://www.doso.net/mydoso/online_mall.selfOperatedMall/getList",
  method: "GET",
  pageSize: 95,
  buildPayload: (page, total, lastPage) => ({
    page,
    pageSize: 95,
    total,
    last_page: lastPage,
    sort: "",
    id: "",
    category_id: "",
    keyword: "",
    barcode: "",
  }),
  extractRows: (payload) => (Array.isArray(payload?.result?.data) ? payload.result.data : []),
  extractTotal: (payload) => toPositiveInt(payload?.result?.total),
  hasNextPage: (payload, rows) => {
    if (!rows.length) return false;
    const currentPage = toPositiveInt(payload?.result?.current_page);
    const lastPage = toPositiveInt(payload?.result?.last_page);
    if (!lastPage) return false;
    return currentPage < lastPage;
  },
};

const dabandaxiConfig: DosoCatalogListConfig = {
  endpoint: "https://www.doso.net/mydoso/dabandaxi.DabandaxiGoods/getList",
  method: "POST",
  pageSize: 20,
  buildPayload: (page, total, lastPage) => ({
    page,
    pageSize: 20,
    total: String(total || 0),
    last_page: lastPage,
    site_id: "13",
    sort: "",
    category_id: "13",
  }),
  extractRows: (payload) => (Array.isArray(payload?.result?.result?.rows) ? payload.result.result.rows : []),
  extractTotal: (payload) => toPositiveInt(payload?.result?.result?.total),
  hasNextPage: (payload, rows) => {
    if (!rows.length) return false;
    return payload?.result?.result?.has_next === true;
  },
};

const etonetConfig: DosoCatalogListConfig = {
  endpoint: "https://www.doso.net/mydoso/etonet.etonetGoods/getList",
  method: "POST",
  pageSize: 95,
  buildPayload: (page, total, lastPage) => ({
    page,
    pageSize: 95,
    total,
    last_page: lastPage,
    site_id: "3000000000",
    sort: "",
  }),
  extractRows: (payload) => (Array.isArray(payload?.result?.result?.rows) ? payload.result.result.rows : []),
  extractTotal: (payload) => toPositiveInt(payload?.result?.result?.total),
  hasNextPage: (_payload, rows) => rows.length > 0,
};

const pathToConfig: Record<string, DosoCatalogListConfig> = {
  "/onlineMall/selfOperatedMall": selfOperatedMallConfig,
  "/onlineMall/PreSelfOperatedMall": selfOperatedMallConfig,
  "/onlineMall/etonet": etonetConfig,
  "/onlineMall/etonetRanking": etonetConfig,
  "/onlineMall/dabandaxi": dabandaxiConfig,
};

export const getDosoCatalogListConfig = (targetUrl: string): DosoCatalogListConfig | null => {
  const path = new URL(targetUrl).pathname;
  return pathToConfig[path] || null;
};
