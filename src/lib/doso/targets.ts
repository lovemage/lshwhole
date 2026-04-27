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
    url: "https://www.kidsvillage.co.kr/shop/",
    label: "Kids Village",
    source: "kidsvillage",
    manualUrlPlaceholder: "https://www.kidsvillage.co.kr/shop/brand.php?sort_id=&br_id=346",
    manualUrlHelp: "建議直接貼上 Kids Village 分類或品牌網址進行同步。",
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
