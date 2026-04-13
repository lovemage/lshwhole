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
];

export interface DosoTargetOption {
  url: string;
  label: string;
}

export const DOSO_TARGET_OPTIONS: DosoTargetOption[] = [
  { url: "https://www.doso.net/onlineMall/selfOperatedMall", label: "批發商城" },
  { url: "https://www.doso.net/onlineMall/PreSelfOperatedMall", label: "批發目錄預購" },
  { url: "https://www.doso.net/onlineMall/etonet", label: "海渡" },
  { url: "https://www.doso.net/onlineMall/etonetRanking", label: "海渡熱賣" },
  { url: "https://www.doso.net/onlineMall/tanbaya", label: "丹波屋" },
  { url: "https://www.doso.net/onlineMall/dabandaxi", label: "大西" },
  { url: "https://www.doso.net/onlineMall/dabansinei", label: "寺內" },
  { url: "https://www.doso.net/onlineMall/shineiRanking", label: "寺內熱賣" },
  { url: "https://www.doso.net/onlineMall/gomen", label: "江錦" },
  { url: "https://www.toybox.kr/", label: "Toybox" },
];
