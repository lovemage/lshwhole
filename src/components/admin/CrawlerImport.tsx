import { useState, useEffect } from "react";
import Script from "next/script";
import { supabase } from "@/lib/supabase";
import {
  DEFAULT_DOSO_TARGETS,
  DOSO_SOURCE_OPTIONS,
  DOSO_TARGET_OPTIONS,
  getTargetOptionByUrl,
} from "@/lib/doso/targets";
import type { DosoCredentialSource } from "@/lib/doso/targets";
import type {
  DosoCredentialsApiResponse,
  DosoImportProduct,
  DosoImportProgressApiResponse,
  DosoImportRunApiResponse,
  DosoImportSessionsListApiResponse,
  DosoImportStartApiResponse,
  DosoImportSessionProgress,
  DosoSourceCategoryMappingApiResponse,
} from "@/lib/doso/types";

interface Category {
  id: number;
  slug: string;
  name: string;
  level: number;
  sort: number;
  description: string;
  icon?: string;
  active: boolean;
  created_at: string;
}

interface Tag {
  id: number;
  slug: string;
  name: string;
  sort: number;
  description: string;
  active: boolean;
  created_at: string;
  category?: string;
}

const DEFAULT_WHOLESALE_ADJUST_PERCENT = 8;
const DEFAULT_RETAIL_ADJUST_PERCENT = 12;

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

export default function CrawlerImport() {
  const [crawlerProducts, setCrawlerProducts] = useState<any[]>([]);
  const [crawlerFiltered, setCrawlerFiltered] = useState<any[]>([]);
  const [crawlerSearch, setCrawlerSearch] = useState("");
  const [crawlerSort, setCrawlerSort] = useState("default");
  const [priceSourceMode, setPriceSourceMode] = useState<"auto" | "jpy" | "krw">("auto");
  const [showSettings, setShowSettings] = useState(false);
  const [exchangeRates, setExchangeRates] = useState({ jpy_to_twd: 0.22, krw_to_twd: 0.024, profitMargin: 0 });

  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [categoryRelations, setCategoryRelations] = useState<any[]>([]);
  const [selectedCrawlerTags, setSelectedCrawlerTags] = useState<number[]>([]);
  const [tagSearchTerm, setTagSearchTerm] = useState("");
  const [publishL1Id, setPublishL1Id] = useState<number | null>(null);

  const [showPublish, setShowPublish] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishTarget, setPublishTarget] = useState<any>(null);
  const [selectedCrawlerProducts, setSelectedCrawlerProducts] = useState<Set<number>>(new Set());
  const [showBatchPriceAdjust, setShowBatchPriceAdjust] = useState(false);
  const [batchPriceAdjustMode, setBatchPriceAdjustMode] = useState<"fixed" | "percentage">("percentage");
  const [batchPriceAdjustCost, setBatchPriceAdjustCost] = useState(0);
  const [batchPriceAdjustWholesale, setBatchPriceAdjustWholesale] = useState(DEFAULT_WHOLESALE_ADJUST_PERCENT);
  const [batchPriceAdjustRetail, setBatchPriceAdjustRetail] = useState(DEFAULT_RETAIL_ADJUST_PERCENT);
  const [batchPublishing, setBatchPublishing] = useState(false);
  const [autoClearPublished, setAutoClearPublished] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);
  const [publishForm, setPublishForm] = useState({
    sku: "",
    title: "",
    description: "",
    cost_twd: 0,
    wholesale_price_twd: 0,
    retail_price_twd: 0,
    image_urls: [] as string[],
  });
  const [showCategoryReview, setShowCategoryReview] = useState(false);
  const [pendingPublishPayload, setPendingPublishPayload] = useState<any | null>(null);
  const [pendingCategoryReview, setPendingCategoryReview] = useState<any | null>(null);
  const [mergeL2Id, setMergeL2Id] = useState<number | null>(null);
  const [mergeL3Id, setMergeL3Id] = useState<number | null>(null);
  const [isBatchReviewMode, setIsBatchReviewMode] = useState(false);
  const [batchReviewQueue, setBatchReviewQueue] = useState<Array<{ payload: any; review: any; productCode: string }>>([]);
  const [batchReviewIndex, setBatchReviewIndex] = useState(0);
  const [batchReviewStats, setBatchReviewStats] = useState({ successCount: 0, failCount: 0, mappingMissCount: 0 });
  const [batchPublishedCodes, setBatchPublishedCodes] = useState<string[]>([]);
  const [batchReviewHandledIndices, setBatchReviewHandledIndices] = useState<Set<number>>(new Set());
  const [batchReviewSelectedIndices, setBatchReviewSelectedIndices] = useState<Set<number>>(new Set());

  interface Spec {
    name: string;
    values: string[];
  }

  interface Variant {
    id: string;
    options: Record<string, string>;
    price: number;
    stock: number;
    sku: string;
  }

  const [specs, setSpecs] = useState<Spec[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // 規格範本
  interface SpecTemplate {
    id: string;
    name: string;
    specs: Spec[];
  }
  const [specTemplates, setSpecTemplates] = useState<SpecTemplate[]>([]);

  interface CandidateImage {
    url: string;
    isProduct: boolean;
    isDescription: boolean;
  }
  const [candidateImages, setCandidateImages] = useState<CandidateImage[]>([]);

  // Batch image editor
  const [showBatchImageEditor, setShowBatchImageEditor] = useState(false);
  const [showBatchPublishModal, setShowBatchPublishModal] = useState(false);
  const [showBatchTranslate, setShowBatchTranslate] = useState(false);
  const [batchTranslateTitle, setBatchTranslateTitle] = useState(true);
  const [batchTranslateDescription, setBatchTranslateDescription] = useState(true);
  const [batchTranslating, setBatchTranslating] = useState(false);

  const [credentialForms, setCredentialForms] = useState<Record<DosoCredentialSource, CredentialFormState>>(emptyCredentialForms);
  const [showCredentialPanel, setShowCredentialPanel] = useState(false);
  const [showDosoGuide, setShowDosoGuide] = useState(false);
  const [selectedTargetPreset, setSelectedTargetPreset] = useState(DEFAULT_DOSO_TARGETS[0] || "");
  const [dosoTargetUrl, setDosoTargetUrl] = useState(DEFAULT_DOSO_TARGETS[0] || "");
  const [manualTargetUrl, setManualTargetUrl] = useState("");
  const [probeError, setProbeError] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importLoadingMessage, setImportLoadingMessage] = useState<string>("");
  const [importLoadingMode, setImportLoadingMode] = useState<"sync" | "import" | null>(null);
  const [currentSyncTargetUrl, setCurrentSyncTargetUrl] = useState("");
  const [importSession, setImportSession] = useState<DosoImportSessionProgress | null>(null);
  const [importSessions, setImportSessions] = useState<DosoImportSessionProgress[]>([]);
  const [runBatchSize, setRunBatchSize] = useState(20);
  const [importStorageKey, setImportStorageKey] = useState("dosoImport:anon");
  const selectedTargetOption = getTargetOptionByUrl(selectedTargetPreset);
  const selectedSource = selectedTargetOption?.source || "doso";
  const selectedSourceLabel = DOSO_SOURCE_OPTIONS.find((x) => x.source === selectedSource)?.label || selectedSource;
  const manualUrlLabel =
    selectedSource === "kidsvillage"
      ? "Kids Village 目標網址 - 貼上頁面抓取 (不支援自動翻頁)"
      : `${selectedSourceLabel} 目標網址（可貼上）`;
  const l1Categories = categories
    .filter((category) => category.level === 1 && category.active)
    .sort((a, b) => a.sort - b.sort);
  const selectedPublishL1Name =
    l1Categories.find((category) => category.id === publishL1Id)?.name ||
    l1Categories.find((category) => category.name.includes("日本"))?.name ||
    l1Categories[0]?.name ||
    "-";
  const maxBatchSize = importSession
    ? Math.max(1, (importSession.total_count || 0) - (importSession.processed_count || 0))
    : 100;
  const currentSessionName = importSession
    ? `${getTargetOptionByUrl(importSession.target_url || "")?.label || "未知來源"} Session #${importSession.session_id}`
    : "-";

  useEffect(() => {
    fetchCategories();
    fetchTags();
    fetchCategoryRelations();
    fetchSpecTemplates();

    // Load local settings
    try {
      const saved = localStorage.getItem("crawlerSettings");
      if (saved) {
        const obj = JSON.parse(saved);
        if (obj && typeof obj === "object") setExchangeRates((prev) => ({ ...prev, ...obj }));
      }
    } catch { }
  }, []);

  useEffect(() => {
    if (publishL1Id || l1Categories.length === 0) return;
    const japanL1 = l1Categories.find((category) => category.name.includes("日本"));
    setPublishL1Id(japanL1?.id || l1Categories[0]?.id || null);
  }, [l1Categories, publishL1Id]);

  useEffect(() => {
    const restoreImportSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const userId = session?.user?.id || "anon";
        const storageKey = `dosoImport:${userId}`;
        setImportStorageKey(storageKey);

        const cachedProducts = localStorage.getItem(`${storageKey}:products`);
        if (cachedProducts) {
          const parsed = JSON.parse(cachedProducts);
          if (Array.isArray(parsed)) {
            setCrawlerProducts(parsed);
            setCrawlerFiltered(applyFilterSort(parsed));
          }
        }

        const rawId = localStorage.getItem(`${storageKey}:sessionId`);
        if (!rawId || !session?.access_token) {
          await fetchImportSessions(false);
          return;
        }

        const sessionId = Number(rawId);
        if (!Number.isInteger(sessionId) || sessionId <= 0) {
          await fetchImportSessions(false);
          return;
        }

        const res = await fetch(`/api/admin/sync/doso/import/${sessionId}/progress`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = (await res.json().catch(() => null)) as DosoImportProgressApiResponse | null;
        if (res.ok && data && data.ok) {
          setImportSession(data.session);
        }
        await fetchImportSessions(true);
      } catch {
        // noop
      }
    };

    restoreImportSession();
  }, []);

  useEffect(() => {
    const fetchSavedCredentials = async () => {
      try {
        const accessToken = await getAdminAccessToken();
        if (!accessToken) return;
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

        const mappingRes = await fetch("/api/admin/sync/doso/source-category-mapping", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const mappingData = (await mappingRes.json().catch(() => null)) as DosoSourceCategoryMappingApiResponse | null;
        if (mappingRes.ok && mappingData?.ok) {
          const mappedL1Id = Number(mappingData.mapping.l1_japan_id) || null;
          if (mappedL1Id) {
            setPublishL1Id((prev) => prev || mappedL1Id);
          }
        }
      } catch {
        // noop
      }
    };

    fetchSavedCredentials();
    fetchImportSessions(true);
  }, []);

  const saveSourceCredentials = async (source: DosoCredentialSource) => {
    const sourceLabel = DOSO_SOURCE_OPTIONS.find((x) => x.source === source)?.label || source;
    const form = credentialForms[source];
    const username = form.username.trim();
    const password = form.password;
    if (!username) {
      alert(`請先輸入 ${sourceLabel} 帳號`);
      return;
    }

    try {
      const accessToken = await getAdminAccessToken();
      if (!accessToken) {
        alert("尚未登入管理員，請重新登入後再試");
        return;
      }

      const res = await fetch("/api/admin/sync/doso/credentials", {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          source,
          username,
          password: password || undefined,
        }),
      });

      const data = (await res.json().catch(() => null)) as DosoCredentialsApiResponse | null;
      if (!res.ok || !data || !data.ok) {
        alert(mapDosoError((data as any)?.error, "儲存帳密失敗"));
        return;
      }

      setCredentialForms((prev) => ({
        ...prev,
        [source]: {
          username: data.username || username,
          password: "",
          hasSavedPassword: Boolean(data.has_password),
        },
      }));
      alert(`${sourceLabel} 帳密已儲存`);
    } catch {
      alert("儲存帳密失敗");
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(`${importStorageKey}:products`, JSON.stringify(crawlerProducts));
    } catch {
      // noop
    }
  }, [crawlerProducts, importStorageKey]);

  useEffect(() => {
    if (!importSession) return;
    if (importSession.status === "completed") {
      localStorage.removeItem(`${importStorageKey}:sessionId`);
      return;
    }
    localStorage.setItem(`${importStorageKey}:sessionId`, String(importSession.session_id));
  }, [importSession, importStorageKey]);

  useEffect(() => {
    if (!importSession || importSession.status !== "running") return;
    const timer = setInterval(() => {
      handleRefreshProgress();
    }, 4000);
    return () => clearInterval(timer);
  }, [importSession]);

  const fetchSpecTemplates = async () => {
    try {
      const res = await fetch("/api/admin/spec-templates");
      if (res.ok) {
        const data = await res.json();
        setSpecTemplates(data);
      }
    } catch (err) {
      console.error("Failed to fetch spec templates:", err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await fetch("/api/tags");
      if (res.ok) {
        const data = await res.json();
        setTags(data);
      }
    } catch (err) {
      console.error("Failed to fetch tags:", err);
    }
  };

  const fetchCategoryRelations = async () => {
    try {
      const res = await fetch("/api/category-relations");
      if (res.ok) {
        const data = await res.json();
        setCategoryRelations(data);
      }
    } catch (err) {
      console.error("Failed to fetch category relations:", err);
    }
  };

  const saveSettings = () => {
    localStorage.setItem("crawlerSettings", JSON.stringify(exchangeRates));
    alert("設定已保存");
  };

  const resetSettings = () => {
    const def = { jpy_to_twd: 0.22, krw_to_twd: 0.024, profitMargin: 0 };
    setExchangeRates(def);
    localStorage.setItem("crawlerSettings", JSON.stringify(def));
  };

  const getPriceTWD = (p: any) => {
    const margin = 1 + (Number(exchangeRates.profitMargin) || 0) / 100;
    // 優先使用 TWD，否則使用來源幣別換算
    if (p.wholesalePriceTWD) return Number(p.wholesalePriceTWD) * margin;
    if (priceSourceMode === "jpy" || (priceSourceMode === "auto" && p.wholesalePriceJPY)) {
      return Number(p.wholesalePriceJPY || 0) * (Number(exchangeRates.jpy_to_twd) || 0) * margin;
    }
    if (priceSourceMode === "krw" || (priceSourceMode === "auto" && p.wholesalePriceKRW)) {
      return Number(p.wholesalePriceKRW || 0) * (Number(exchangeRates.krw_to_twd) || 0) * margin;
    }
    return 0;
  };

  const applyFilterSort = (list: any[]) => {
    let arr = list;
    if (crawlerSearch.trim()) {
      const q = crawlerSearch.trim().toLowerCase();
      arr = arr.filter((p) =>
        (p.productCode || "").toString().toLowerCase().includes(q) ||
        (p.title || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
      );
    }
    if (crawlerSort === "price-asc") arr = [...arr].sort((a, b) => getPriceTWD(a) - getPriceTWD(b));
    if (crawlerSort === "price-desc") arr = [...arr].sort((a, b) => getPriceTWD(b) - getPriceTWD(a));
    if (crawlerSort === "code-asc") arr = [...arr].sort((a, b) => String(a.productCode).localeCompare(String(b.productCode)));
    if (crawlerSort === "code-desc") arr = [...arr].sort((a, b) => String(b.productCode).localeCompare(String(a.productCode)));
    return arr;
  };

  useEffect(() => {
    if (!crawlerProducts.length) return;
    setCrawlerFiltered(applyFilterSort(crawlerProducts));
  }, [crawlerProducts, crawlerSearch, crawlerSort, priceSourceMode]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const allJson = fileList.every((f) => f.name.toLowerCase().endsWith(".json"));

    if (allJson) {
      const allItems: any[] = [];
      for (const file of fileList) {
        const text = await file.text();
        try {
          const data = JSON.parse(text);
          const arr = Array.isArray(data) ? data : [data];
          allItems.push(...arr);
        } catch {
          alert(`JSON 解析失敗：${file.name}`);
          e.target.value = "";
          return;
        }
      }
      parseJson(allItems);
      e.target.value = "";
      return;
    }

    // For Excel, keep current behavior: only use the first file.
    const file = fileList[0];
    const name = file.name.toLowerCase();

    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      // 需依賴 XLSX CDN
      const w: any = window as any;
      if (!w.XLSX) {
        alert("Excel 解析庫尚未載入，請稍後重試");
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = w.XLSX.read(data, { type: "array" });
        const firstSheet = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheet];
        const json = w.XLSX.utils.sheet_to_json(sheet);
        parseJson(json);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert("僅支援 .json / .xlsx 檔案");
    }

    e.target.value = "";
  };

  const mapRawImportItem = (it: any) => {
    const images = Array.isArray(it.images)
      ? it.images
      : Array.isArray(it.imgs)
        ? it.imgs
        : Array.isArray(it.imageUrls)
          ? it.imageUrls
          : it.image
            ? [it.image]
            : [];

    const _images = images.map((url: string) => ({
      url,
      isProduct: true,
      isDescription: false,
    }));

    return {
      productCode: it.productCode || it.code || it.sku || it.id || "無代碼",
      title: it.title || it.name || "無標題",
      description: it.description || it.desc || "",
      wholesalePriceJPY: it.wholesalePriceJPY || it.priceJPY || it.price_jpy || it.jpy || null,
      wholesalePriceKRW: it.wholesalePriceKRW || it.priceKRW || it.price_krw || it.krw || null,
      wholesalePriceTWD: it.wholesalePriceTWD || it.priceTWD || it.twd || null,
      url: it.url || it.link || null,
      sourceCategoryId: it.sourceCategoryId || it.source_category_id || it.category_id || null,
      sourceCategoryName: it.sourceCategoryName || it.source_category_name || it.category_name || null,
      sourceDirectoryUrl: it.sourceDirectoryUrl || it.source_directory_url || null,
      images,
      _images,
    };
  };

  const parseJson = (input: any) => {
    const arr = Array.isArray(input) ? input : [input];
    const mapped = arr.map((it: any) => mapRawImportItem(it));
    setCrawlerProducts(mapped);
    setCrawlerFiltered(applyFilterSort(mapped));
  };

  const appendImportedProducts = (products: DosoImportProduct[]) => {
    if (!products.length) return;
    const mapped = products.map((p) => mapRawImportItem(p));
    const merged = [...crawlerProducts, ...mapped];
    setCrawlerProducts(merged);
    setCrawlerFiltered(applyFilterSort(merged));
  };

  const getAdminAccessToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const willExpireSoon = Boolean(session?.expires_at) && session!.expires_at! * 1000 < Date.now() + 60_000;
    if (session?.access_token && !willExpireSoon) {
      return session.access_token;
    }

    const { data: refreshed } = await supabase.auth.refreshSession();
    return refreshed?.session?.access_token || session?.access_token || null;
  };

  const fetchImportSessions = async (keepCurrent = true, preferredSessionId?: number | null) => {
    try {
      const accessToken = await getAdminAccessToken();
      if (!accessToken) return;

      const res = await fetch("/api/admin/sync/doso/import/sessions", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = (await res.json().catch(() => null)) as DosoImportSessionsListApiResponse | null;
      if (!res.ok || !data || !data.ok) return;

      const sessions = data.sessions || [];
      setImportSessions(sessions);

      if (!keepCurrent) {
        setImportSession(sessions[0] || null);
        return;
      }

      if (Number.isInteger(preferredSessionId) && Number(preferredSessionId) > 0) {
        const matchedPreferred = sessions.find((x) => x.session_id === preferredSessionId);
        if (matchedPreferred) {
          setImportSession(matchedPreferred);
          return;
        }
      }

      if (importSession) {
        const matched = sessions.find((x) => x.session_id === importSession.session_id);
        if (matched) {
          setImportSession(matched);
          return;
        }
      }

      const rawId = localStorage.getItem(`${importStorageKey}:sessionId`);
      const sessionId = Number(rawId);
      if (Number.isInteger(sessionId) && sessionId > 0) {
        const matchedByLocal = sessions.find((x) => x.session_id === sessionId);
        if (matchedByLocal) {
          setImportSession(matchedByLocal);
          return;
        }
      }

      if (!importSession && sessions.length > 0) {
        setImportSession(sessions[0]);
      }
    } catch {
      // noop
    }
  };


  const getDirectoryUrlFromProduct = (p: any) => {
    const candidate = String(p?.sourceDirectoryUrl || "").trim();
    if (candidate) return candidate;

    const origin = String(p?.url || p?.original_url || "").trim();
    if (!origin) return null;
    return getTargetOptionByUrl(origin)?.url || null;
  };

  const getTargetLabelByUrl = (url?: string | null) => {
    const raw = String(url || "").trim();
    if (!raw) return "未知目錄";
    return getTargetOptionByUrl(raw)?.label || "未知目錄";
  };


  const isValidSyncTargetUrl = (value: string) => {
    try {
      const u = new URL(value);
      if (u.protocol !== "https:" && u.protocol !== "http:") return false;
      return DOSO_TARGET_OPTIONS.some((opt) => {
        try {
          const allowed = new URL(opt.url);
          const allowedPath = allowed.pathname.replace(/\/$/, "");
          const inputPath = u.pathname.replace(/\/$/, "");
          if (u.hostname !== allowed.hostname) return false;
          if (!allowedPath) return true;
          return inputPath.startsWith(allowedPath);
        } catch {
          return false;
        }
      });
    } catch {
      return false;
    }
  };

  const handleTargetPresetChange = (value: string) => {
    setSelectedTargetPreset(value);
    setDosoTargetUrl(value);
    if (!getTargetOptionByUrl(value)?.manualUrlPlaceholder) {
      setManualTargetUrl("");
    }
  };

  const mapDosoError = (codeOrMessage: string | null | undefined, fallback: string) => {
    const code = (codeOrMessage || "").trim();
    if (!code) return fallback;
    const map: Record<string, string> = {
      missing_encryption_key: "伺服器缺少加密金鑰，請通知管理員設定環境變數",
      invalid_encryption_key: "加密金鑰格式錯誤，請通知管理員檢查設定",
      credential_read_failed: "讀取已儲存帳密失敗，請稍後再試",
      credential_save_failed: "儲存帳密失敗，請稍後再試",
      probe_api_failed: "探測服務暫時不可用，請稍後再試",
      get_source_category_mapping_failed: "讀取來源分類映射失敗，請稍後再試",
      refresh_source_categories_failed: "同步來源分類失敗，請稍後再試",
      save_source_category_mapping_failed: "儲存來源分類映射失敗，請稍後再試",
      invalid_l1_japan_id: "請先設定日本 L1 分類",
      invalid_category_mapping: "來源分類映射包含無效分類，請重新選擇",
      invalid_category_mapping_hierarchy: "來源分類映射層級不正確，請確認 L2/L3 階層",
      missing_category_mapping: "部分商品沒有可用分類映射，請先補齊來源分類對應",
      invalid_l1_override: "指定的 L1 分類無效，請重新選擇",
      invalid_l1_override_hierarchy: "目前選擇的 L1 與來源自動判定分類不相容，請改用分類確認合併",
      unauthorized: "管理員登入已過期，請重新登入後再試",
    };
    return map[code] || code;
  };

  const formatCategoryRiskFlag = (flag: string) => {
    const map: Record<string, string> = {
      numeric_name: "來源分類名稱疑似數字",
      auto_create: "將自動建立新分類",
      missing_mapping: "缺少來源分類映射",
      override_l1_hierarchy_mismatch: "目前 L1 與自動分類階層不相容",
    };
    return map[flag] || flag;
  };

  const shouldAbortBatchPublishForError = (codeOrMessage: string | null | undefined) => {
    const code = String(codeOrMessage || "").trim();
    return [
      "unauthorized",
      "invalid_l1_japan_id",
      "invalid_l1_override",
      "invalid_l1_override_hierarchy",
    ].includes(code);
  };

  const handleDosoImport = async () => {
    const selectedOption = getTargetOptionByUrl(selectedTargetPreset);
    const source = selectedOption?.source || "doso";
    const sourceLabel = DOSO_SOURCE_OPTIONS.find((x) => x.source === source)?.label || source;
    const form = credentialForms[source];
    const username = form.username.trim();
    const password = form.password.trim();
    const targetUrl = selectedOption?.manualUrlPlaceholder
      ? (manualTargetUrl.trim() || dosoTargetUrl.trim())
      : dosoTargetUrl.trim();

    if (!username || (!password && !form.hasSavedPassword)) {
      alert(`選擇 ${sourceLabel} 時，請先輸入或儲存帳號密碼`);
      return;
    }

    if (!targetUrl || !isValidSyncTargetUrl(targetUrl)) {
      alert("請輸入已支援的同步來源網址");
      return;
    }

    const shouldResetList = crawlerProducts.length > 0;
    if (shouldResetList) {
      const ok = confirm("目前已有導入清單，建立新導入 session 後是否清空並重新開始？");
      if (!ok) return;
    }

    setImportLoading(true);
    setImportLoadingMode("sync");
    setProbeError(null);
    setImportLoadingMessage("");
    setCurrentSyncTargetUrl(targetUrl);

    try {
      const accessToken = await getAdminAccessToken();
      if (!accessToken) {
        setProbeError("尚未登入管理員，請重新登入後再試");
        return;
      }

      const res = await fetch("/api/admin/sync/doso/import/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          username: username || undefined,
          password: password || undefined,
          target_url: targetUrl,
        }),
      });

      const data = (await res.json().catch(() => null)) as DosoImportStartApiResponse | null;
      if (res.status === 401) {
        const message = (data as any)?.error || "unauthorized";
        setProbeError(mapDosoError(message, "導入失敗 (401)"));
        return;
      }
      if (!res.ok || !data) {
        setProbeError(mapDosoError((data as any)?.error, `導入失敗 (${res.status})`));
        return;
      }

      if (!data.ok) {
        setProbeError(mapDosoError("error" in data ? data.error : null, "建立導入 session 失敗"));
        return;
      }

      setImportSession(data.session);
      await fetchImportSessions(true);

      if (shouldResetList) {
        setCrawlerProducts([]);
        setCrawlerFiltered([]);
        setSelectedCrawlerProducts(new Set());
        localStorage.removeItem(`${importStorageKey}:products`);
      }

      alert(`已建立導入 session，總商品數 ${data.session.total_count}，請按「導入網站」。`);
    } catch (err) {
      setProbeError(err instanceof Error ? err.message : "導入時發生錯誤");
    } finally {
      setImportLoading(false);
      setImportLoadingMode(null);
      setImportLoadingMessage("");
      setCurrentSyncTargetUrl("");
    }
  };

  const handleDosoRun = async () => {
    if (!importSession) {
      alert("請先建立導入 session");
      return;
    }

    setImportLoading(true);
    setImportLoadingMode("import");
    setProbeError(null);
    setImportLoadingMessage("");
    setCurrentSyncTargetUrl(importSession.target_url || "");

    try {
      const accessToken = await getAdminAccessToken();
      if (!accessToken) {
        setProbeError("尚未登入管理員，請重新登入後再試");
        return;
      }

      const res = await fetch(`/api/admin/sync/doso/import/${importSession.session_id}/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ batch_size: runBatchSize }),
      });

      const data = (await res.json().catch(() => null)) as DosoImportRunApiResponse | null;
      if (res.status === 401) {
        const message = (data as any)?.error || "unauthorized";
        setProbeError(mapDosoError(message, "續傳失敗 (401)"));
        return;
      }
      if (!res.ok || !data) {
        setProbeError(mapDosoError((data as any)?.error, `續傳失敗 (${res.status})`));
        return;
      }

      if (!data.ok) {
        setProbeError(mapDosoError("error" in data ? data.error : null, "續傳失敗"));
        return;
      }

      setImportSession(data.session);
      appendImportedProducts(data.products || []);
      await fetchImportSessions(true);
    } catch (err) {
      setProbeError(err instanceof Error ? err.message : "續傳時發生錯誤");
    } finally {
      setImportLoading(false);
      setImportLoadingMode(null);
      setImportLoadingMessage("");
      setCurrentSyncTargetUrl("");
    }
  };

  const handlePickImportSession = async (sessionId: number) => {
    try {
      const picked = importSessions.find((x) => x.session_id === sessionId);
      if (picked) {
        setImportSession(picked);
      }

      const accessToken = await getAdminAccessToken();
      if (!accessToken) return;
      const res = await fetch(`/api/admin/sync/doso/import/${sessionId}/progress`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = (await res.json().catch(() => null)) as DosoImportProgressApiResponse | null;
      if (!res.ok || !data || !data.ok) return;
      setImportSession(data.session);
      localStorage.setItem(`${importStorageKey}:sessionId`, String(data.session.session_id));
      await fetchImportSessions(true, data.session.session_id);
    } catch {
      // noop
    }
  };

  const handleResetSingleImportSession = async (sessionId: number) => {
    const ok = confirm(`確定要刪除同步任務 Session #${sessionId} 嗎？`);
    if (!ok) return;

    setImportLoading(true);
    setProbeError(null);
    setImportLoadingMessage("刪除session請稍後");
    try {
      const accessToken = await getAdminAccessToken();
      if (!accessToken) {
        setProbeError("尚未登入管理員，請重新登入後再試");
        return;
      }

      const res = await fetch(`/api/admin/sync/doso/import/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setProbeError(mapDosoError(data?.error, "刪除同步任務失敗"));
        return;
      }

      if (importSession?.session_id === sessionId) {
        setImportSession(null);
        localStorage.removeItem(`${importStorageKey}:sessionId`);
      }
      await fetchImportSessions(false);
    } catch (err) {
      setProbeError(err instanceof Error ? err.message : "刪除同步任務失敗");
    } finally {
      setImportLoading(false);
      setImportLoadingMessage("");
    }
  };

  const handleRefreshProgress = async () => {
    if (!importSession) return;

    try {
      const accessToken = await getAdminAccessToken();
      if (!accessToken) return;

      const res = await fetch(`/api/admin/sync/doso/import/${importSession.session_id}/progress`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = (await res.json().catch(() => null)) as DosoImportProgressApiResponse | null;
      if (!res.ok || !data || !data.ok) return;
      setImportSession(data.session);
      await fetchImportSessions(true);
    } catch {
      // noop
    }
  };

  const handleResetImportSession = async () => {
    const clearAllLocalSessionBindings = () => {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i += 1) {
          const key = localStorage.key(i);
          if (!key) continue;
          if (/^dosoImport:.*:sessionId$/.test(key)) {
            keysToRemove.push(key);
          }
        }
        for (const key of keysToRemove) {
          localStorage.removeItem(key);
        }
      } catch {
        // noop
      }
    };

    const hasSession = Boolean(importSession);
    if (!hasSession) {
      localStorage.removeItem(`${importStorageKey}:sessionId`);
      clearAllLocalSessionBindings();
      alert("已清除本機導入 session 記錄");
      return;
    }

    const ok = confirm("確定要刪除目前導入 session 嗎？此動作不會刪除已導入商品清單。");
    if (!ok) return;

    setImportLoading(true);
    setProbeError(null);
    setImportLoadingMessage("刪除session請稍後");

    try {
      if (
        importSession &&
        importSession.status !== "completed" &&
        importSession.status !== "failed" &&
        importSession.status !== "paused"
      ) {
        const accessToken = await getAdminAccessToken();
        if (accessToken) {
          await fetch(`/api/admin/sync/doso/import/${importSession.session_id}/pause`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
          }).catch(() => null);
        }
      }
    } finally {
      setImportSession(null);
      localStorage.removeItem(`${importStorageKey}:sessionId`);
      clearAllLocalSessionBindings();
      setImportLoading(false);
      setImportLoadingMessage("");
      alert("已刪除 Session，請按「同步商品」建立新 Session。");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        const res = await fetch("/api/upload", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: formData,
        });

        const rawText = await res.text();
        const data = (() => {
          try {
            return rawText ? JSON.parse(rawText) : {};
          } catch {
            return null;
          }
        })();

        if (!res.ok) {
          console.error("Upload failed:", (data as any)?.error || rawText || res.status);
          continue;
        }

        if (data && (data as any).url) {
          setCandidateImages((prev) => [
            ...prev,
            { url: (data as any).url, isProduct: true, isDescription: false },
          ]);
        } else {
          console.error("Upload failed:", (data as any)?.error || "Unknown error");
        }
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("圖片上傳失敗");
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = "";
    }
  };

  const addSpec = () => {
    setSpecs([...specs, { name: "", values: [] }]);
  };

  const updateSpecName = (idx: number, name: string) => {
    const newSpecs = [...specs];
    newSpecs[idx].name = name;
    setSpecs(newSpecs);
  };

  const addSpecValue = (idx: number, value: string) => {
    if (!value.trim()) return;
    const newSpecs = [...specs];
    if (!newSpecs[idx].values.includes(value.trim())) {
      newSpecs[idx].values.push(value.trim());
      setSpecs(newSpecs);
      generateVariants(newSpecs);
    }
  };

  const removeSpecValue = (specIdx: number, valIdx: number) => {
    const newSpecs = [...specs];
    newSpecs[specIdx].values.splice(valIdx, 1);
    setSpecs(newSpecs);
    generateVariants(newSpecs);
  };

  const removeSpec = (idx: number) => {
    const newSpecs = [...specs];
    newSpecs.splice(idx, 1);
    setSpecs(newSpecs);
    generateVariants(newSpecs);
  };

  const generateVariants = (currentSpecs: Spec[]) => {
    if (currentSpecs.length === 0) {
      setVariants([]);
      return;
    }

    // Generate Cartesian product
    const combine = (acc: any[], specIdx: number): any[] => {
      if (specIdx === currentSpecs.length) return acc;

      const spec = currentSpecs[specIdx];
      if (spec.values.length === 0) return combine(acc, specIdx + 1); // Skip empty specs

      const nextAcc: any[] = [];
      if (acc.length === 0) {
        spec.values.forEach(v => {
          nextAcc.push({ [spec.name]: v });
        });
      } else {
        acc.forEach(item => {
          spec.values.forEach(v => {
            nextAcc.push({ ...item, [spec.name]: v });
          });
        });
      }
      return combine(nextAcc, specIdx + 1);
    };

    const optionsList = combine([], 0);

    // Create variants preserving existing data if possible
    const newVariants = optionsList.map((opts, i) => {
      const key = JSON.stringify(opts);
      // Try to find existing variant with same options to keep price/stock
      const existing = variants.find(v => JSON.stringify(v.options) === key);
      return existing || {
        id: Date.now() + "-" + i,
        options: opts,
        price: publishForm.retail_price_twd,
        stock: 10,
        sku: `${publishForm.sku}-${i + 1}`
      };
    });

    setVariants(newVariants);
  };

  const updateVariant = (idx: number, field: keyof Variant, value: any) => {
    const newVariants = [...variants];
    newVariants[idx] = { ...newVariants[idx], [field]: value };
    setVariants(newVariants);
  };

  const openPublish = (p: any) => {
    const costTwd = Math.floor(Number(getPriceTWD(p) || 0));
    // 自動計算批發價和零售價：批發價 = 成本價 + 25%，零售價 = 成本價 + 35%
    const wholesaleTwd = Math.floor(costTwd * 1.25);
    const retailTwd = Math.floor(costTwd * 1.35);

    setPublishTarget(p);
    setPublishForm({
      sku: String(p.productCode || ""),
      title: String(p.title || ""),
      description: String(p.description || ""),
      cost_twd: costTwd,
      wholesale_price_twd: wholesaleTwd,
      retail_price_twd: retailTwd,
      image_urls: [], // Will be derived from candidateImages
    });

    setSpecs([]);
    setVariants([]);

    const images = Array.isArray(p.images) ? [...p.images] : [];
    setCandidateImages(images.map((url: string) => ({
      url,
      isProduct: true, // Default to product image
      isDescription: false
    })));

    setShowPublish(true);
  };

  const moveCandidateImage = (idx: number, dir: -1 | 1) => {
    setCandidateImages((prev) => {
      const arr = [...prev];
      const to = idx + dir;
      if (to < 0 || to >= arr.length) return prev;
      const tmp = arr[idx];
      arr[idx] = arr[to];
      arr[to] = tmp;
      return arr;
    });
  };

  const toggleCandidateType = (idx: number, type: 'isProduct' | 'isDescription') => {
    setCandidateImages((prev) => {
      const arr = [...prev];
      const newVal = !arr[idx][type];
      arr[idx] = { ...arr[idx], [type]: newVal };
      if (newVal) {
        if (type === 'isProduct') arr[idx].isDescription = false;
        else arr[idx].isProduct = false;
      }
      return arr;
    });
  };

  const recalculatePrices = () => {
    const costTwd = publishForm.cost_twd;
    if (costTwd <= 0) {
      alert("請先設定成本價格");
      return;
    }
    const wholesaleTwd = Math.floor(costTwd * 1.25);
    const retailTwd = Math.floor(costTwd * 1.35);

    setPublishForm(prev => ({
      ...prev,
      wholesale_price_twd: wholesaleTwd,
      retail_price_twd: retailTwd
    }));
  };



  const handleTranslate = async (field: "title" | "description") => {
    const text = field === "title" ? publishForm.title : publishForm.description;
    if (!text) return alert("無內容可翻譯");

    try {
      setIsTranslating(true);
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.translatedText) {
          setPublishForm(prev => ({
            ...prev,
            [field]: data.translatedText
          }));
        }
      } else {
        alert("翻譯失敗，請稍後再試");
      }
    } catch (err) {
      console.error("Translation failed:", err);
      alert("翻譯發生錯誤");
    } finally {
      setIsTranslating(false);
    }
  };

  const requestTranslateText = async (text: string) => {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      throw new Error("translate_failed");
    }

    const data = await res.json();
    return String(data?.translatedText || "");
  };

  const requestPublishConfirm = async (
    payload: any,
    manualMergeCategoryIds?: number[] | null,
    providedToken?: string | null
  ) => {
    const accessToken = providedToken || (await getAdminAccessToken());
    if (!accessToken) {
      return { ok: false as const, error: "unauthorized" };
    }
    const body = {
      ...payload,
      category_review_mode: "confirm",
      ...(manualMergeCategoryIds && manualMergeCategoryIds.length > 0
        ? { manual_merge_category_ids: manualMergeCategoryIds }
        : {}),
    };
    const res = await fetch("/api/publish-product", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false as const, error: json?.error || "publish_failed" };
    }
    return { ok: true as const, data: json };
  };

  const confirmPublishPayload = async (payload: any, manualMergeCategoryIds?: number[] | null) => {
    const result = await requestPublishConfirm(payload, manualMergeCategoryIds);
    if (!result.ok) {
      if (result.error === "unauthorized") {
        alert("尚未登入管理員，請重新登入後再試");
        return;
      }
      alert(mapDosoError(result.error, "上架失敗"));
      return;
    }

    alert("上架成功");
    setShowPublish(false);
    setShowCategoryReview(false);
    setPendingPublishPayload(null);
    setPendingCategoryReview(null);
    setMergeL2Id(null);
    setMergeL3Id(null);
  };

  const publishNow = async () => {
    try {
      setPublishing(true);
      const accessToken = await getAdminAccessToken();
      if (!accessToken) {
        alert("尚未登入管理員，請重新登入後再試");
        return;
      }

      const toInt = (v: any) =>
        v === null || v === undefined || v === "" ? null : Math.floor(Number(v));
      const payload = {
        sku: publishForm.sku,
        title: publishForm.title,
        description: publishForm.description,
        cost_twd: toInt(publishForm.cost_twd),
        wholesale_price_twd: toInt(publishForm.wholesale_price_twd),
        retail_price_twd: toInt(publishForm.retail_price_twd),
        status: "published",
        tag_ids: selectedCrawlerTags,
        image_urls: candidateImages.filter(i => i.isProduct).map(i => i.url),
        original_url: publishTarget?.url || null,
        source_category_id: publishTarget?.sourceCategoryId || null,
        source_category_name: publishTarget?.sourceCategoryName || null,
        source_directory_url: getDirectoryUrlFromProduct(publishTarget),
        category_l1_id_override: publishL1Id,
        specs,
        variants: variants.map(v => ({
          name: Object.values(v.options).join(" / "),
          options: v.options,
          price: v.price,
          stock: v.stock,
          sku: v.sku
        }))
      };

      // Append description images
      const descImagesHtml = candidateImages
        .filter(i => i.isDescription)
        .map(i => `<img src="${i.url}" style="width: 100%; margin: 10px 0;" />`)
        .join("");

      if (descImagesHtml) {
        payload.description = payload.description
          ? `${payload.description}<br/>${descImagesHtml}`
          : descImagesHtml;
      }

      if (!payload.sku || !payload.title) {
        alert("請填寫 SKU 與標題");
        return;
      }
      if (!payload.source_directory_url) {
        alert("找不到可用分類映射，請先設定來源分類映射");
        return;
      }

      const previewRes = await fetch("/api/publish-product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          sku: payload.sku,
          title: payload.title,
          source_category_id: payload.source_category_id,
          source_category_name: payload.source_category_name,
          source_directory_url: payload.source_directory_url,
          original_url: payload.original_url,
          category_l1_id_override: publishL1Id,
          category_review_mode: "preview",
        }),
      });

      const previewData = await previewRes.json().catch(() => null);
      if (!previewRes.ok) {
        alert(mapDosoError(previewData?.error, "分類預檢失敗"));
        return;
      }
      const needsReview = Boolean(previewData?.category_review?.needs_review);
      if (needsReview) {
        setPendingPublishPayload(payload);
        setPendingCategoryReview(previewData.category_review);
        setMergeL2Id(null);
        setMergeL3Id(null);
        setShowCategoryReview(true);
        return;
      }

      await confirmPublishPayload(payload);
    } finally {
      setPublishing(false);
    }
  };

  const confirmPublishWithAutoCategory = async () => {
    if (!pendingPublishPayload) return;
    if (isBatchReviewMode) {
      await handleBatchReviewApplySelected(null);
      return;
    }
    try {
      setPublishing(true);
      await confirmPublishPayload(pendingPublishPayload);
    } finally {
      setPublishing(false);
    }
  };

  const confirmPublishWithMergedCategory = async () => {
    if (!pendingPublishPayload || !pendingCategoryReview) return;
    const l1Id = Number(pendingCategoryReview?.proposed_category?.l1_id || 0);
    if (!l1Id || !mergeL2Id) {
      alert("請先選擇要合併的 L2 分類");
      return;
    }

    const manualMergeCategoryIds = [l1Id, mergeL2Id, mergeL3Id || null].filter(Boolean) as number[];
    if (isBatchReviewMode) {
      await handleBatchReviewApplySelected(manualMergeCategoryIds);
      return;
    }
    try {
      setPublishing(true);
      await confirmPublishPayload(pendingPublishPayload, manualMergeCategoryIds);
    } finally {
      setPublishing(false);
    }
  };

  const finalizeBatchPublish = (
    successCount: number,
    failCount: number,
    mappingMissCount: number,
    reviewRequiredCount: number,
    publishedCodes: string[]
  ) => {
    alert(`批量上架完成\n成功：${successCount}\n失敗：${failCount}${mappingMissCount > 0 ? `\n分類映射缺失：${mappingMissCount}` : ""}${reviewRequiredCount > 0 ? `\n人工分類確認：${reviewRequiredCount}` : ""}`);

    if (autoClearPublished && publishedCodes.length > 0) {
      const codeSet = new Set(publishedCodes);
      const updated = crawlerProducts.filter((p) => !codeSet.has(String(p.productCode || "")));
      setCrawlerProducts(updated);
      setCrawlerFiltered(applyFilterSort(updated));
    }

    setSelectedCrawlerProducts(new Set());
    setIsBatchReviewMode(false);
    setBatchReviewQueue([]);
    setBatchReviewIndex(0);
    setBatchReviewStats({ successCount: 0, failCount: 0, mappingMissCount: 0 });
    setBatchPublishedCodes([]);
    setBatchReviewHandledIndices(new Set());
    setBatchReviewSelectedIndices(new Set());
    setShowCategoryReview(false);
    setPendingPublishPayload(null);
    setPendingCategoryReview(null);
    setMergeL2Id(null);
    setMergeL3Id(null);
  };

  const getNextBatchReviewIndex = (handled: Set<number>) => {
    return batchReviewQueue.findIndex((_, idx) => !handled.has(idx));
  };

  const moveToBatchReviewIndex = (index: number) => {
    const item = batchReviewQueue[index];
    if (!item) return;
    setBatchReviewIndex(index);
    setPendingPublishPayload(item.payload);
    setPendingCategoryReview(item.review);
    setMergeL2Id(null);
    setMergeL3Id(null);
  };

  const processBatchReviewIndexes = async (
    reviewIndexes: number[],
    manualMergeCategoryIds: number[] | null
  ) => {
    const validIndexes = Array.from(new Set(reviewIndexes))
      .filter((idx) => idx >= 0 && idx < batchReviewQueue.length)
      .filter((idx) => !batchReviewHandledIndices.has(idx));

    if (validIndexes.length === 0) {
      return;
    }

    const nextStats = { ...batchReviewStats };
    const nextCodes = [...batchPublishedCodes];
    const nextHandled = new Set(batchReviewHandledIndices);

    for (const idx of validIndexes) {
      const item = batchReviewQueue[idx];
      if (!item) continue;

      const result = await requestPublishConfirm(item.payload, manualMergeCategoryIds);
      if (result.ok) {
        nextStats.successCount += 1;
        nextCodes.push(item.productCode);
      } else {
        nextStats.failCount += 1;
        if (result.error === "missing_category_mapping") {
          nextStats.mappingMissCount += 1;
        }
      }

      nextHandled.add(idx);
    }

    if (nextHandled.size >= batchReviewQueue.length) {
      finalizeBatchPublish(
        nextStats.successCount,
        nextStats.failCount,
        nextStats.mappingMissCount,
        batchReviewQueue.length,
        nextCodes
      );
      return;
    }

    const nextIndex = getNextBatchReviewIndex(nextHandled);
    if (nextIndex < 0) {
      finalizeBatchPublish(
        nextStats.successCount,
        nextStats.failCount,
        nextStats.mappingMissCount,
        batchReviewQueue.length,
        nextCodes
      );
      return;
    }

    setBatchReviewStats(nextStats);
    setBatchPublishedCodes(nextCodes);
    setBatchReviewHandledIndices(nextHandled);
    setBatchReviewSelectedIndices(new Set([nextIndex]));
    moveToBatchReviewIndex(nextIndex);
  };

  const handleBatchReviewApplySelected = async (manualMergeCategoryIds: number[] | null) => {
    const selectedIndexes = Array.from(batchReviewSelectedIndices).filter(
      (idx) => idx >= 0 && idx < batchReviewQueue.length && !batchReviewHandledIndices.has(idx)
    );
    if (selectedIndexes.length === 0) {
      alert("請先在左側待確認清單勾選至少一筆");
      return;
    }

    let targetIndexes = selectedIndexes;
    if (manualMergeCategoryIds && manualMergeCategoryIds.length > 0) {
      const selectedL1Id = manualMergeCategoryIds[0];
      const compatible = selectedIndexes.filter((idx) => {
        const itemL1 = Number(batchReviewQueue[idx]?.review?.proposed_category?.l1_id || 0);
        return itemL1 === selectedL1Id;
      });
      const skipped = selectedIndexes.length - compatible.length;
      if (compatible.length === 0) {
        alert("已選項目與目前 L1 不一致，無法批量合併，請改選同一個 L1 的商品。");
        return;
      }
      if (skipped > 0) {
        alert(`已自動略過 ${skipped} 筆不同 L1 的商品，僅處理相同 L1。`);
      }
      targetIndexes = compatible;
    }

    try {
      setPublishing(true);
      await processBatchReviewIndexes(targetIndexes, manualMergeCategoryIds);
    } finally {
      setPublishing(false);
    }
  };

  const toggleBatchReviewSelection = (index: number) => {
    setBatchReviewSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectAllPendingBatchReviews = () => {
    const allPending = batchReviewQueue
      .map((_, idx) => idx)
      .filter((idx) => !batchReviewHandledIndices.has(idx));
    setBatchReviewSelectedIndices(new Set(allPending));
  };

  const clearBatchReviewSelection = () => {
    setBatchReviewSelectedIndices(new Set());
  };

  const toggleSelectProduct = (idx: number) => {
    setSelectedCrawlerProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(idx)) {
        newSet.delete(idx);
      } else {
        newSet.add(idx);
      }
      return newSet;
    });
  };

  const toggleSelectAllCrawler = () => {
    if (selectedCrawlerProducts.size === crawlerFiltered.length) {
      setSelectedCrawlerProducts(new Set());
    } else {
      setSelectedCrawlerProducts(new Set(crawlerFiltered.map((_, idx) => idx)));
    }
  };

  const applyBatchPriceAdjust = () => {
    if (selectedCrawlerProducts.size === 0) {
      alert("請先選擇商品");
      return;
    }

    if (batchPriceAdjustCost === 0 && batchPriceAdjustWholesale === 0 && batchPriceAdjustRetail === 0) {
      alert("請至少調整一個價格");
      return;
    }

    const updated = crawlerFiltered.map((p, idx) => {
      if (!selectedCrawlerProducts.has(idx)) return p;

      const currentPrice = getPriceTWD(p);
      let newPrice = currentPrice;

      if (batchPriceAdjustCost !== 0) {
        if (batchPriceAdjustMode === "fixed") {
          newPrice = currentPrice + batchPriceAdjustCost;
        } else {
          newPrice = Math.floor(currentPrice * (1 + batchPriceAdjustCost / 100));
        }

        if (p.wholesalePriceJPY) {
          p.wholesalePriceJPY = Math.floor(newPrice / exchangeRates.jpy_to_twd);
        } else if (p.wholesalePriceKRW) {
          p.wholesalePriceKRW = Math.floor(newPrice / exchangeRates.krw_to_twd);
        }
      }

      p._wholesaleAdjust = batchPriceAdjustWholesale;
      p._retailAdjust = batchPriceAdjustRetail;
      p._adjustMode = batchPriceAdjustMode;

      return p;
    });

    setCrawlerProducts(updated);
    setCrawlerFiltered(applyFilterSort(updated));
    setShowBatchPriceAdjust(false);
    alert("價格已調整");
  };

  const applyBatchTranslate = async () => {
    if (!batchTranslateTitle && !batchTranslateDescription) {
      alert("請至少選擇一個翻譯欄位");
      return;
    }
    if (selectedCrawlerProducts.size === 0) {
      alert("請先選擇商品");
      return;
    }

    try {
      setBatchTranslating(true);
      const updated = [...crawlerProducts];
      let successCount = 0;
      let failedCount = 0;
      let skippedCount = 0;

      for (const filteredIdx of Array.from(selectedCrawlerProducts)) {
        const target = crawlerFiltered[filteredIdx];
        if (!target) {
          skippedCount++;
          continue;
        }
        const sourceIndex = updated.findIndex(
          (x) => String(x.productCode || "") === String(target.productCode || "")
        );
        if (sourceIndex < 0) {
          skippedCount++;
          continue;
        }

        let changed = false;
        try {
          if (batchTranslateTitle) {
            const title = String(updated[sourceIndex].title || "").trim();
            if (title) {
              const translatedTitle = await requestTranslateText(title);
              if (translatedTitle) {
                updated[sourceIndex].title = translatedTitle;
                changed = true;
              }
            }
          }

          if (batchTranslateDescription) {
            const description = String(updated[sourceIndex].description || "").trim();
            if (description) {
              const translatedDescription = await requestTranslateText(description);
              if (translatedDescription) {
                updated[sourceIndex].description = translatedDescription;
                changed = true;
              }
            }
          }

          if (changed) successCount++;
          else skippedCount++;
        } catch {
          failedCount++;
        }
      }

      setCrawlerProducts(updated);
      setCrawlerFiltered(applyFilterSort(updated));
      setShowBatchTranslate(false);
      alert(`批量翻譯完成\n成功：${successCount}\n失敗：${failedCount}\n略過：${skippedCount}`);
    } finally {
      setBatchTranslating(false);
    }
  };

  const openBatchPriceAdjustModal = () => {
    setBatchPriceAdjustMode("percentage");
    setBatchPriceAdjustCost(0);
    setBatchPriceAdjustWholesale(DEFAULT_WHOLESALE_ADJUST_PERCENT);
    setBatchPriceAdjustRetail(DEFAULT_RETAIL_ADJUST_PERCENT);
    setShowBatchPriceAdjust(true);
  };

  const batchPublish = async (skipConfirm = false) => {
    if (selectedCrawlerProducts.size === 0) {
      alert("請先選擇商品");
      return;
    }

    if (!skipConfirm && !confirm(`確定要上架選中的 ${selectedCrawlerProducts.size} 件商品嗎？`)) return;

    setShowBatchPublishModal(false);

    setBatchPublishing(true);
    let successCount = 0;
    let failCount = 0;
    const publishedCodes: string[] = [];
    let mappingMissCount = 0;
    let abortedReason: string | null = null;
    const reviewQueue: Array<{ payload: any; review: any; productCode: string }> = [];

    const toInt = (v: any) =>
      v === null || v === undefined || v === "" ? null : Math.floor(Number(v));

    const accessToken = await getAdminAccessToken();
    if (!accessToken) {
      setBatchPublishing(false);
      alert("尚未登入管理員，請重新登入後再試");
      return;
    }

    for (const idx of Array.from(selectedCrawlerProducts)) {
      const p = crawlerFiltered[idx];
      if (!p) continue;

      // Calculate prices
      let cost = getPriceTWD(p);
      if (p._costAdjust) {
        cost = p._adjustMode === "fixed" ? cost + p._costAdjust : cost * (1 + p._costAdjust / 100);
      }

      let wholesale = Math.floor(cost * 1.25);
      if (p._wholesaleAdjust) {
        wholesale = p._adjustMode === "fixed" ? wholesale + p._wholesaleAdjust : wholesale * (1 + p._wholesaleAdjust / 100);
      }

      let retail = Math.floor(cost * 1.35);
      if (p._retailAdjust) {
        retail = p._adjustMode === "fixed" ? retail + p._retailAdjust : retail * (1 + p._retailAdjust / 100);
      }

      // Prepare images
      let image_urls: string[] = [];
      let description = p.description || "";

      if (p._images && Array.isArray(p._images)) {
        image_urls = p._images.filter((img: any) => img.isProduct).map((img: any) => img.url);
        const descHtml = p._images
          .filter((img: any) => img.isDescription)
          .map((img: any) => `<img src="${img.url}" style="width: 100%; margin: 10px 0;" />`)
          .join("");
        if (descHtml) {
          description = description ? `${description}<br/>${descHtml}` : descHtml;
        }
      } else {
        // Fallback to original behavior
        image_urls = Array.isArray(p.images) ? [...p.images] : [];
      }

      const payload = {
        sku: String(p.productCode || ""),
        title: String(p.title || ""),
        description: description,
        cost_twd: toInt(cost),
        wholesale_price_twd: toInt(wholesale),
        retail_price_twd: toInt(retail),
        status: "published",
        tag_ids: selectedCrawlerTags,
        image_urls: image_urls,
        original_url: p.url || null,
        source_category_id: p.sourceCategoryId || null,
        source_category_name: p.sourceCategoryName || null,
        source_directory_url: getDirectoryUrlFromProduct(p),
        category_l1_id_override: publishL1Id,
      };

      try {
        const previewRes = await fetch("/api/publish-product", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            sku: payload.sku,
            title: payload.title,
            source_category_id: payload.source_category_id,
            source_category_name: payload.source_category_name,
            source_directory_url: payload.source_directory_url,
            original_url: payload.original_url,
            category_l1_id_override: publishL1Id,
            category_review_mode: "preview",
          }),
        });
        const previewData = await previewRes.json().catch(() => null);
        if (!previewRes.ok) {
          const errorCode = previewData?.error || null;
          setProbeError(mapDosoError(errorCode, `分類預檢失敗 (${previewRes.status})`));
          if (shouldAbortBatchPublishForError(errorCode)) {
            abortedReason = mapDosoError(errorCode, "批量上架已中止");
            failCount++;
            break;
          }
          failCount++;
          continue;
        }
        if (previewData?.category_review?.needs_review) {
          reviewQueue.push({
            payload,
            review: previewData.category_review,
            productCode: String(p.productCode || ""),
          });
          continue;
        }

        const result = await requestPublishConfirm(payload, null, accessToken);
        if (result.ok) {
          successCount++;
          publishedCodes.push(String(p.productCode || ""));
        } else {
          setProbeError(mapDosoError(result.error, "上架失敗"));
          if (shouldAbortBatchPublishForError(result.error)) {
            abortedReason = mapDosoError(result.error, "批量上架已中止");
            failCount++;
            break;
          }
          if (result.error === "missing_category_mapping") {
            mappingMissCount++;
          }
          failCount++;
        }
      } catch (err) {
        failCount++;
      }
    }

    if (abortedReason) {
      setBatchPublishing(false);
      alert(`${abortedReason}\n批量上架已停止，請修正後重試。`);
      return;
    }

    if (reviewQueue.length > 0) {
      setIsBatchReviewMode(true);
      setBatchReviewQueue(reviewQueue);
      setBatchReviewIndex(0);
      setBatchReviewStats({ successCount, failCount, mappingMissCount });
      setBatchPublishedCodes(publishedCodes);
      setBatchReviewHandledIndices(new Set());
      setBatchReviewSelectedIndices(new Set([0]));
      setPendingPublishPayload(reviewQueue[0].payload);
      setPendingCategoryReview(reviewQueue[0].review);
      setMergeL2Id(null);
      setMergeL3Id(null);
      setShowCategoryReview(true);
      setBatchPublishing(false);
      return;
    }

    setBatchPublishing(false);
    finalizeBatchPublish(successCount, failCount, mappingMissCount, 0, publishedCodes);
  };

  const removeCrawlerItem = (filteredIdx: number) => {
    const target = crawlerFiltered[filteredIdx];
    if (!target) return;

    const updated = [...crawlerProducts];
    const sourceIndex = updated.findIndex((x) => String(x.productCode || "") === String(target.productCode || ""));
    if (sourceIndex < 0) return;

    updated.splice(sourceIndex, 1);
    setCrawlerProducts(updated);
    setCrawlerFiltered(applyFilterSort(updated));
    setSelectedCrawlerProducts(new Set());
  };

  const clearAllImportedProducts = () => {
    const total = crawlerProducts.length;
    if (total <= 0) return;

    const ok = confirm(`確定要清空目前導入的 ${total} 件商品嗎？`);
    if (!ok) return;

    setCrawlerProducts([]);
    setCrawlerFiltered([]);
    setSelectedCrawlerProducts(new Set());
  };

  const updateBatchImage = (productIdx: number, imgIdx: number, field: 'isProduct' | 'isDescription') => {
    const updated = [...crawlerProducts];
    const p = updated[productIdx];
    if (p && p._images && p._images[imgIdx]) {
      const newVal = !p._images[imgIdx][field];
      p._images[imgIdx][field] = newVal;
      if (newVal) {
        if (field === 'isProduct') p._images[imgIdx].isDescription = false;
        else p._images[imgIdx].isProduct = false;
      }
      setCrawlerProducts(updated);
      setCrawlerFiltered(applyFilterSort(updated));
    }
  };

  const moveBatchImage = (productIdx: number, imgIdx: number, dir: -1 | 1) => {
    const updated = [...crawlerProducts];
    const p = updated[productIdx];
    if (p && p._images) {
      const arr = p._images;
      const to = imgIdx + dir;
      if (to >= 0 && to < arr.length) {
        const tmp = arr[imgIdx];
        arr[imgIdx] = arr[to];
        arr[to] = tmp;
        setCrawlerProducts(updated);
        setCrawlerFiltered(applyFilterSort(updated));
      }
    }
  };

  return (
    <div className="py-6 space-y-6">
      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <input id="crawler-file" type="file" multiple accept=".json,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
        <label htmlFor="crawler-file" className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90">
          <span className="material-symbols-outlined text-white">upload_file</span>
          <span>選擇檔案</span>
        </label>
        <button onClick={() => setShowSettings((s) => !s)} className="inline-flex items-center gap-2 rounded-lg border border-border-light bg-card-light px-4 py-2 text-sm font-medium text-text-primary-light hover:bg-primary/10">
          <span className="material-symbols-outlined">tune</span>
          匯率設定
        </button>
        <div className="text-sm text-text-secondary-light">
          已載入：<span className="font-medium text-text-primary-light">{crawlerProducts.length}</span> 筆，
          顯示：<span className="font-medium text-text-primary-light">{crawlerFiltered.length}</span> 筆
        </div>
      </div>

      {/* Settings */}
      {showSettings && (
        <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border-light bg-card-light p-4">
          <div className="flex flex-col">
            <label className="text-xs text-text-secondary-light">JPY → TWD</label>
            <input type="number" step="0.001" value={exchangeRates.jpy_to_twd}
              onChange={(e) => setExchangeRates({ ...exchangeRates, jpy_to_twd: Number(e.target.value) })}
              className="mt-1 w-40 rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-text-secondary-light">KRW → TWD</label>
            <input type="number" step="0.0001" value={exchangeRates.krw_to_twd}
              onChange={(e) => setExchangeRates({ ...exchangeRates, krw_to_twd: Number(e.target.value) })}
              className="mt-1 w-40 rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-text-secondary-light">利潤率 %</label>
            <input type="number" step="1" value={exchangeRates.profitMargin}
              onChange={(e) => setExchangeRates({ ...exchangeRates, profitMargin: Number(e.target.value) })}
              className="mt-1 w-32 rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={saveSettings} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90">保存</button>
            <button onClick={resetSettings} className="rounded-lg border border-border-light bg-card-light px-4 py-2 text-sm font-medium hover:bg-primary/10">重置</button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border-light bg-card-light p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-text-primary-light">商品同步-導入[多平台]</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowDosoGuide(true)}
            className="text-xs text-primary hover:underline"
          >
            使用方式
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary-light mb-1">目錄（一次僅限一個）</label>
          <select
            value={selectedTargetPreset}
            onChange={(e) => handleTargetPresetChange(e.target.value)}
            className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
          >
            {DOSO_TARGET_OPTIONS.map((option) => (
              <option key={option.url} value={option.url}>{option.label}（{option.url}）</option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border border-border-light bg-background-light">
          <button
            type="button"
            onClick={() => setShowCredentialPanel((value) => !value)}
            className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
          >
            <div className="text-sm font-medium text-text-primary-light">同步站帳密</div>
            <span className="material-symbols-outlined text-base">{showCredentialPanel ? "expand_less" : "expand_more"}</span>
          </button>
          {showCredentialPanel && (
            <div className="grid grid-cols-1 gap-4 border-t border-border-light px-3 py-3 lg:grid-cols-3">
              {DOSO_SOURCE_OPTIONS.map((sourceOption) => {
                const form = credentialForms[sourceOption.source];
                return (
                  <div key={sourceOption.source} className="space-y-3">
                    <div className="text-xs font-semibold text-text-secondary-light">{sourceOption.label}</div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary-light mb-1">帳號</label>
                      <input
                        type="text"
                        value={form.username}
                        onChange={(e) =>
                          setCredentialForms((prev) => ({
                            ...prev,
                            [sourceOption.source]: {
                              ...prev[sourceOption.source],
                              username: e.target.value,
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
                        placeholder={sourceOption.usernamePlaceholder}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary-light mb-1">密碼</label>
                      <input
                        type="password"
                        value={form.password}
                        onChange={(e) =>
                          setCredentialForms((prev) => ({
                            ...prev,
                            [sourceOption.source]: {
                              ...prev[sourceOption.source],
                              password: e.target.value,
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
                        placeholder={form.hasSavedPassword ? "已儲存密碼（留空不更新）" : "輸入密碼"}
                      />
                      <p className="mt-1 text-xs text-text-secondary-light">{form.hasSavedPassword ? "目前已有已儲存密碼" : "目前尚未儲存密碼"}</p>
                    </div>
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

        {selectedTargetOption?.manualUrlPlaceholder && (
          <div>
            <label className="block text-sm font-medium text-text-primary-light mb-1">{manualUrlLabel}</label>
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
            <div className="mt-1 text-xs text-text-secondary-light">
              {selectedTargetOption.manualUrlHelp || "建議直接貼上分類或品牌網址進行同步。"}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border-light bg-background-light p-3 space-y-3">
          <div className="text-sm font-bold text-text-primary-light">Step 1. 同步（建立/選擇同步任務）</div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleDosoImport}
              disabled={importLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-border-light bg-card-light px-4 py-2 text-sm font-bold text-text-primary-light hover:bg-primary/10 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">download</span>
              {importLoading ? "處理中..." : "同步商品（建立新任務）"}
            </button>
            <button
              onClick={() => fetchImportSessions(false)}
              disabled={importLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-border-light bg-card-light px-4 py-2 text-sm font-bold text-text-primary-light hover:bg-primary/10 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">refresh</span>
              重新整理任務
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {importSessions.length === 0 && (
              <div className="md:col-span-3 text-xs text-text-secondary-light">尚無同步任務，請先按「同步商品（建立新任務）」。</div>
            )}
            {importSessions.map((s) => {
              const selected = importSession?.session_id === s.session_id;
              return (
                <div
                  key={s.session_id}
                  className={`rounded-lg border p-2 ${selected ? "border-primary bg-primary/5" : "border-border-light bg-card-light"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-bold text-text-primary-light">{getTargetLabelByUrl(s.target_url)} Session #{s.session_id}</div>
                    <div className="text-[11px] text-text-secondary-light">{s.status}</div>
                  </div>
                  <div className="mt-1 text-[11px] text-text-secondary-light break-all">{s.target_url || "-"}</div>
                  <div className="mt-1 text-[11px] text-text-secondary-light">{s.processed_count} / {s.total_count}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => handlePickImportSession(s.session_id)}
                      disabled={importLoading}
                      className="rounded border border-border-light px-2 py-1 text-[11px] text-text-primary-light hover:bg-primary/10 disabled:opacity-50"
                    >
                      使用此任務
                    </button>
                    <button
                      onClick={() => handleResetSingleImportSession(s.session_id)}
                      disabled={importLoading}
                      className="rounded border border-border-light px-2 py-1 text-[11px] text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-border-light bg-background-light p-3 space-y-3">
          <div className="text-sm font-bold text-text-primary-light">{`Step 2. 導入（當前:${currentSessionName}）`}</div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 text-xs text-text-secondary-light">
              <span>批次大小</span>
              <input
                type="number"
                min={1}
                max={maxBatchSize}
                value={runBatchSize}
                onChange={(e) => setRunBatchSize(Math.min(maxBatchSize, Math.max(1, Number(e.target.value) || 20)))}
                className="w-20 rounded border border-border-light bg-card-light px-2 py-1 text-xs"
              />
              <button
                type="button"
                onClick={() => setRunBatchSize(maxBatchSize)}
                disabled={!importSession || importLoading}
                className="rounded border border-border-light bg-card-light px-2 py-1 text-[11px] text-text-primary-light hover:bg-primary/10 disabled:opacity-50"
              >
                max
              </button>
            </div>
            <button
              onClick={handleDosoRun}
              disabled={
                importLoading ||
                !importSession ||
                importSession.status === "completed" ||
                importSession.status === "failed"
              }
              className="inline-flex items-center gap-2 rounded-lg border border-border-light bg-card-light px-4 py-2 text-sm font-bold text-text-primary-light hover:bg-primary/10 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">play_arrow</span>
              {importLoading ? "處理中..." : `導入網站（Session #${importSession?.session_id || "-"}）`}
            </button>
            <button
              onClick={handleResetImportSession}
              disabled={importLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-border-light bg-card-light px-4 py-2 text-sm font-bold text-text-primary-light hover:bg-primary/10 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">restart_alt</span>
              清除目前綁定
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {probeError && <span className="text-sm text-red-600">{probeError}</span>}
        </div>

        <p className="text-xs text-text-secondary-light">
          使用摘要：Step 1 先「同步商品」建立任務（可保留近 3 筆並切換／刪除）；Step 2 再對目前 Session 按「導入網站」。導入可中斷續跑，且會自動跳過已存在 SKU。
        </p>

        {importSession && (
          <div className="rounded-lg border border-border-light p-3 bg-background-light space-y-2">
            <div className="text-sm text-text-primary-light font-medium">導入進度（{getTargetLabelByUrl(importSession.target_url)} Session #{importSession.session_id}）</div>
            <div className="text-xs text-text-secondary-light">
              狀態：<span className="font-medium text-text-primary-light">{importSession.status}</span>
              ，總商品數：<span className="font-medium text-text-primary-light">{importSession.total_count}</span>
              ，目前進度：<span className="font-medium text-text-primary-light">{importSession.processed_count} / {importSession.total_count}</span>
            </div>
            <div className="text-xs text-text-secondary-light">
              imported：<span className="font-medium text-text-primary-light">{importSession.imported_count}</span>
              ，skipped：<span className="font-medium text-text-primary-light">{importSession.skipped_count}</span>
              ，failed：<span className="font-medium text-text-primary-light">{importSession.failed_count}</span>
            </div>
            <div className="h-2 rounded bg-border-light overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${
                    importSession.total_count > 0
                      ? Math.min(100, Math.round((importSession.processed_count / importSession.total_count) * 100))
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        )}

      </div>

      {showDosoGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-xl bg-card-light border border-border-light p-5 space-y-4">
            <h4 className="text-base font-bold text-text-primary-light">DOSO 導入使用方式</h4>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-text-secondary-light">
              <li>先輸入 DOSO 帳號與密碼。</li>
              <li>從下拉選單選擇一個目錄。</li>
              <li>Step 1：按「同步商品（建立新任務）」，可建立多個同步任務並切換 Session。</li>
              <li>Step 2：確認目前 Session 後按「導入網站」持續導入。</li>
              <li>查看進度區塊的總商品數與目前進度。</li>
              <li>中斷後可回到頁面繼續導入。</li>
            </ol>
            <div className="rounded-lg border border-border-light bg-background-light p-3 text-xs text-text-secondary-light leading-5">
              <div className="font-semibold text-text-primary-light mb-1">使用方式摘要</div>
              <div>1) 先同步：建立或選擇一個 Session（可刪除）。</div>
              <div>2) 再導入：用目前 Session 分批導入（可調整批次大小）。</div>
              <div>3) 若中斷：回到此頁選同一個 Session，直接續傳。</div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowDosoGuide(false)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={crawlerSearch}
          onChange={(e) => setCrawlerSearch(e.target.value)}
          placeholder="搜尋代碼 / 標題 / 描述..."
          className="flex-1 min-w-60 rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
        />
        <select value={crawlerSort} onChange={(e) => setCrawlerSort(e.target.value)} className="rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm">
          <option value="default">排序：預設</option>
          <option value="code-asc">代碼 A → Z</option>
          <option value="code-desc">代碼 Z → A</option>
          <option value="price-asc">價格 低 → 高</option>
          <option value="price-desc">價格 高 → 低</option>
        </select>
        <select value={priceSourceMode} onChange={(e) => setPriceSourceMode(e.target.value as any)} className="rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm">
          <option value="auto">價格來源：自動</option>
          <option value="jpy">強制 JPY</option>
          <option value="krw">強制 KRW</option>
        </select>
      </div>

      {/* 批量操作工具欄 */}
      {crawlerFiltered.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border-light bg-card-light p-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedCrawlerProducts.size === crawlerFiltered.length && crawlerFiltered.length > 0}
              onChange={toggleSelectAllCrawler}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-text-primary-light">
              全選 ({selectedCrawlerProducts.size}/{crawlerFiltered.length})
            </span>
          </label>

          <button
            onClick={clearAllImportedProducts}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            <span className="material-symbols-outlined text-base">delete_sweep</span>
            全部清空
          </button>

          {selectedCrawlerProducts.size > 0 && (
            <>
              <div className="h-6 w-px bg-border-light"></div>
              <button
                onClick={openBatchPriceAdjustModal}
                className="inline-flex items-center gap-2 rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm font-medium text-text-primary-light hover:bg-primary/10"
              >
                <span className="material-symbols-outlined text-base">price_change</span>
                批量調整價格
              </button>
              <button
                onClick={() => setShowBatchImageEditor(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm font-medium text-text-primary-light hover:bg-primary/10"
              >
                <span className="material-symbols-outlined text-base">collections</span>
                批量圖片編輯
              </button>
              <button
                onClick={() => setShowBatchTranslate(true)}
                disabled={batchTranslating || isTranslating}
                className="inline-flex items-center gap-2 rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm font-medium text-text-primary-light hover:bg-primary/10 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">translate</span>
                批量翻譯
              </button>
              <button
                onClick={() => setShowBatchPublishModal(true)}
                disabled={batchPublishing}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">cloud_upload</span>
                批量上架 ({selectedCrawlerProducts.size})
              </button>
              <label className="ml-2 inline-flex items-center gap-2 text-sm text-text-secondary-light">
                <input
                  type="checkbox"
                  checked={autoClearPublished}
                  onChange={(e) => setAutoClearPublished(e.target.checked)}
                  className="w-4 h-4"
                />
                上架後自動清空已上架商品
              </label>
            </>
          )}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {crawlerFiltered.map((p, idx) => (
          <div
            key={idx}
            className={`flex flex-col overflow-hidden rounded-xl border-2 transition-colors ${selectedCrawlerProducts.has(idx)
              ? "border-primary bg-primary/5"
              : "border-border-light bg-card-light"
              }`}
          >
            <div className="relative aspect-square w-full bg-gray-100 overflow-hidden">
              <img src={p.images?.[0] || "https://placehold.co/600x600?text=No+Image"} alt={p.title} className="h-full w-full object-cover" />
              <label className="absolute top-2 left-2 flex items-center justify-center w-6 h-6 bg-white rounded-md border-2 border-gray-300 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedCrawlerProducts.has(idx)}
                  onChange={() => toggleSelectProduct(idx)}
                  className="w-4 h-4 cursor-pointer"
                />
              </label>
              <button
                type="button"
                onClick={() => removeCrawlerItem(idx)}
                className="absolute top-2 right-2 inline-flex items-center justify-center w-7 h-7 rounded-md bg-white/95 border border-border-light text-red-600 hover:bg-red-50"
                title="刪除商品"
              >
                <span className="material-symbols-outlined text-base">delete</span>
              </button>
            </div>
            <div className="p-3">
              <div className="text-xs text-text-secondary-light">#{String(p.productCode)}</div>
              <div className="mt-1 line-clamp-2 text-sm font-semibold text-text-primary-light">{p.title}</div>

              {/* 成本價 */}
              <div className="mt-2 flex items-baseline justify-between">
                <div className="text-base font-bold text-text-primary-light">NT${getPriceTWD(p).toFixed(0)}</div>
                <div className="text-xs text-text-secondary-light">
                  {p.wholesalePriceJPY ? `¥${Number(p.wholesalePriceJPY).toLocaleString()}` : p.wholesalePriceKRW ? `₩${Number(p.wholesalePriceKRW).toLocaleString()}` : "-"}
                </div>
              </div>

              {/* 批發價和零售價預覽 */}
              {(p._wholesaleAdjust !== undefined || p._retailAdjust !== undefined) && (
                <div className="mt-2 rounded-lg bg-blue-50 border border-blue-200 p-2">
                  <div className="text-xs text-blue-900">
                    {p._wholesaleAdjust !== undefined && p._wholesaleAdjust !== 0 && (
                      <div>批發: {p._adjustMode === "fixed" ? `${p._wholesaleAdjust > 0 ? "+" : ""}${p._wholesaleAdjust}` : `${p._wholesaleAdjust > 0 ? "+" : ""}${p._wholesaleAdjust}%`}</div>
                    )}
                    {p._retailAdjust !== undefined && p._retailAdjust !== 0 && (
                      <div>零售: {p._adjustMode === "fixed" ? `${p._retailAdjust > 0 ? "+" : ""}${p._retailAdjust}` : `${p._retailAdjust > 0 ? "+" : ""}${p._retailAdjust}%`}</div>
                    )}
                  </div>
                </div>
              )}

              {p.url && (
                <a href={p.url} target="_blank" className="mt-2 inline-block text-xs text-primary hover:underline">來源連結</a>
              )}
              <div className="mt-3">
                <button onClick={() => openPublish(p)} className="w-full px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90">
                  上架
                </button>
              </div>
            </div>
          </div>
        ))}
        {crawlerFiltered.length === 0 && (
          <div className="col-span-full text-sm text-text-secondary-light">尚未載入資料或無符合項目</div>
        )}
      </div>

      {showPublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-xl border border-border-light bg-card-light p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary-light">上架商品</h3>
              <button className="text-text-secondary-light" onClick={() => setShowPublish(false)}>關閉</button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* 左：圖片與排序 */}
              <div>
                <div className="text-sm font-medium mb-2">圖片（可調整順序/勾選要上架的圖）</div>
                <div className="space-y-3 max-h-[50vh] overflow-auto pr-1">
                  <div className="mb-2">
                    <label className="cursor-pointer inline-flex items-center gap-2 w-full justify-center rounded-lg border-2 border-dashed border-border-light p-4 hover:bg-background-light transition-colors">
                      <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                      <span className="material-symbols-outlined text-text-secondary-light">add_photo_alternate</span>
                      <span className="text-sm text-text-secondary-light">{isUploading ? "上傳中..." : "上傳自訂圖片"}</span>
                    </label>
                  </div>
                  {candidateImages.map((img, i) => (
                    <div key={i} className="flex items-start gap-3 p-2 border border-border-light rounded-lg bg-background-light">
                      <img src={img.url} alt="img" className="h-20 w-20 object-cover border border-border-light rounded-md shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={img.isProduct}
                              onChange={() => toggleCandidateType(i, 'isProduct')}
                              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-text-primary-light">商品圖</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={img.isDescription}
                              onChange={() => toggleCandidateType(i, 'isDescription')}
                              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-text-primary-light">描述圖</span>
                          </label>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          className="p-1 hover:bg-gray-100 rounded text-text-secondary-light"
                          onClick={() => moveCandidateImage(i, -1)}
                          disabled={i === 0}
                        >
                          <span className="material-symbols-outlined text-lg">arrow_upward</span>
                        </button>
                        <button
                          className="p-1 hover:bg-gray-100 rounded text-text-secondary-light"
                          onClick={() => moveCandidateImage(i, +1)}
                          disabled={i === candidateImages.length - 1}
                        >
                          <span className="material-symbols-outlined text-lg">arrow_downward</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  {candidateImages.length === 0 && (
                    <div className="text-sm text-text-secondary-light">此商品無圖片</div>
                  )}
                </div>
              </div>

              {/* 右：基本資料 */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-text-secondary-light">SKU</label>
                  <input value={publishForm.sku} onChange={(e) => setPublishForm({ ...publishForm, sku: e.target.value })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sm text-text-secondary-light">標題</label>
                    <button
                      type="button"
                      onClick={() => handleTranslate("title")}
                      disabled={isTranslating || !publishForm.title}
                      className="text-xs text-primary hover:underline disabled:opacity-50"
                    >
                      {isTranslating ? "翻譯中..." : "翻譯成中文"}
                    </button>
                  </div>
                  <input value={publishForm.title} onChange={(e) => setPublishForm({ ...publishForm, title: e.target.value })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sm text-text-secondary-light">描述</label>
                    <button
                      type="button"
                      onClick={() => handleTranslate("description")}
                      disabled={isTranslating || !publishForm.description}
                      className="text-xs text-primary hover:underline disabled:opacity-50"
                    >
                      {isTranslating ? "翻譯中..." : "翻譯成中文"}
                    </button>
                  </div>
                  <textarea value={publishForm.description} onChange={(e) => setPublishForm({ ...publishForm, description: e.target.value })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm min-h-24" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-text-primary-light">價格設定 (台幣整數)</label>
                    <button
                      type="button"
                      onClick={recalculatePrices}
                      className="px-3 py-1 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                    >
                      重新計算 (+25%/+35%)
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-sm text-text-secondary-light">成本</label>
                      <input type="number" step={1} min={0} value={publishForm.cost_twd} onChange={(e) => setPublishForm({ ...publishForm, cost_twd: Math.max(0, Math.floor(Number(e.target.value || 0))) })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-sm text-text-secondary-light">批發價 (+25%)</label>
                      <input type="number" step={1} min={0} value={publishForm.wholesale_price_twd} onChange={(e) => setPublishForm({ ...publishForm, wholesale_price_twd: Math.max(0, Math.floor(Number(e.target.value || 0))) })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-sm text-text-secondary-light">零售價 (+35%)</label>
                      <input type="number" step={1} min={0} value={publishForm.retail_price_twd} onChange={(e) => setPublishForm({ ...publishForm, retail_price_twd: Math.max(0, Math.floor(Number(e.target.value || 0))) })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-text-secondary-light">
                    預設：批發價 = 成本 × 1.25，零售價 = 成本 × 1.35，可手動調整
                  </div>
                </div>
                {/* 規格與變體 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-text-primary-light">規格設定</label>
                    <div className="flex items-center gap-3">
                      {specTemplates.length > 0 && (
                        <select
                          onChange={(e) => {
                            const template = specTemplates.find(t => t.id === e.target.value);
                            if (template) {
                              setSpecs(JSON.parse(JSON.stringify(template.specs)));
                              generateVariants(template.specs);
                            }
                            e.target.value = "";
                          }}
                          className="text-xs border border-border-light rounded px-2 py-1 text-text-secondary-light"
                          defaultValue=""
                        >
                          <option value="" disabled>套用範本...</option>
                          {specTemplates.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={addSpec}
                        className="text-xs text-primary hover:underline"
                      >
                        + 新增規格
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {specs.map((spec, idx) => (
                      <div key={idx} className="p-3 border border-border-light rounded-lg bg-background-light">
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            placeholder="規格名稱 (例: 顏色)"
                            value={spec.name}
                            onChange={(e) => updateSpecName(idx, e.target.value)}
                            className="flex-1 rounded border border-border-light px-2 py-1 text-sm"
                          />
                          <button onClick={() => removeSpec(idx)} className="text-text-secondary-light hover:text-red-500">
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {spec.values.map((val, vIdx) => (
                            <div key={vIdx} className="flex items-center gap-1 bg-white border border-border-light rounded px-2 py-1">
                              <span className="text-sm">{val}</span>
                              <button onClick={() => removeSpecValue(idx, vIdx)} className="text-text-secondary-light hover:text-red-500">
                                <span className="material-symbols-outlined text-sm">close</span>
                              </button>
                            </div>
                          ))}
                          <input
                            placeholder="+ 值 (Enter新增)"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addSpecValue(idx, e.currentTarget.value);
                                e.currentTarget.value = "";
                              }
                            }}
                            className="w-24 rounded border border-border-light px-2 py-1 text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  {specs.length > 0 && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => generateVariants(specs)}
                        className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                      >
                        生成變體列表
                      </button>
                    </div>
                  )}
                  {variants.length > 0 && (
                    <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                      {variants.map((v, vIdx) => (
                        <div key={v.id} className="flex items-center gap-2 p-2 border border-border-light rounded bg-white text-sm">
                          <div className="w-1/3 truncate font-medium" title={Object.values(v.options).join("/")}>
                            {Object.values(v.options).join("/")}
                          </div>
                          <input
                            type="number"
                            placeholder="價格"
                            value={v.price}
                            onChange={(e) => updateVariant(vIdx, "price", Number(e.target.value))}
                            className="w-20 rounded border border-border-light px-2 py-1"
                          />
                          <input
                            type="number"
                            placeholder="庫存"
                            value={v.stock}
                            onChange={(e) => updateVariant(vIdx, "stock", Number(e.target.value))}
                            className="w-16 rounded border border-border-light px-2 py-1"
                          />
                          <input
                            placeholder="SKU"
                            value={v.sku}
                            onChange={(e) => updateVariant(vIdx, "sku", e.target.value)}
                            className="flex-1 rounded border border-border-light px-2 py-1"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* 分類選擇 */}
                <div className="rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm text-text-secondary-light">
                  分類將依來源資料自動判定（L1 {selectedPublishL1Name}）。若系統判斷需確認，按「確認上架」後會跳出合併彈窗。
                </div>
                {/* 標籤選擇（共用選擇狀態） */}
                <div>
                  <div className="text-sm text-text-secondary-light mb-1">標籤</div>
                  <div className="max-h-40 overflow-y-auto border border-border-light rounded p-2">
                    {["A1", "A2", "A3"].map(cat => {
                      const catName = cat === "A1" ? "品牌" : cat === "A2" ? "屬性" : "活動";
                      const catTags = tags.filter(t => t.category === cat || (!t.category && cat === "A2"));
                      if (catTags.length === 0) return null;
                      return (
                        <div key={cat} className="mb-2 last:mb-0">
                          <div className="text-xs font-bold text-text-secondary-light mb-1">{catName}</div>
                          <div className="flex flex-wrap gap-2">
                            {catTags.map((t) => (
                              <label key={t.id} className="inline-flex items-center gap-1 text-sm bg-white border border-border-light px-2 py-1 rounded">
                                <input type="checkbox" checked={selectedCrawlerTags.includes(t.id)} onChange={(e) => {
                                  if (e.target.checked) setSelectedCrawlerTags([...selectedCrawlerTags, t.id]);
                                  else setSelectedCrawlerTags(selectedCrawlerTags.filter(x => x !== t.id));
                                }} />
                                <span>{t.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {tags.length === 0 && <div className="text-xs text-text-secondary-light">尚無標籤</div>}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button disabled={publishing} onClick={() => setShowPublish(false)} className="px-4 py-2 rounded-lg border border-border-light text-sm disabled:opacity-50">取消</button>
              <button disabled={publishing} onClick={publishNow} className="px-4 py-2 rounded-lg bg-primary text-white text-sm disabled:opacity-50">確認上架</button>
            </div>
          </div>
        </div>
      )}

      {showCategoryReview && pendingCategoryReview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4">
          <div className={`w-full rounded-xl border border-border-light bg-card-light p-6 ${isBatchReviewMode ? "max-w-5xl" : "max-w-2xl"}`}>
            <div className={`grid gap-4 ${isBatchReviewMode ? "grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]" : "grid-cols-1"}`}>
              {isBatchReviewMode && (
                <div className="rounded-lg border border-border-light bg-background-light p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-bold text-text-primary-light">待確認清單</div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="rounded border border-border-light px-2 py-0.5 text-[11px] text-text-secondary-light hover:bg-white"
                        onClick={selectAllPendingBatchReviews}
                      >
                        全選待處理
                      </button>
                      <button
                        type="button"
                        className="rounded border border-border-light px-2 py-0.5 text-[11px] text-text-secondary-light hover:bg-white"
                        onClick={clearBatchReviewSelection}
                      >
                        清除
                      </button>
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-text-secondary-light">
                    已完成 {batchReviewHandledIndices.size} / {batchReviewQueue.length}，已選 {batchReviewSelectedIndices.size} 筆
                  </div>
                  <div className="mt-3 max-h-[56vh] space-y-2 overflow-y-auto pr-1">
                    {batchReviewQueue.map((item, idx) => {
                      const status = batchReviewHandledIndices.has(idx) ? "done" : idx === batchReviewIndex ? "current" : "pending";
                      return (
                        <div
                          key={`${item.productCode}-${idx}`}
                          onClick={() => {
                            if (batchReviewHandledIndices.has(idx)) return;
                            moveToBatchReviewIndex(idx);
                            setBatchReviewSelectedIndices(new Set([idx]));
                          }}
                          className={`rounded border px-2 py-2 text-xs ${
                            status === "done"
                              ? "border-emerald-200 bg-emerald-50"
                              : status === "current"
                              ? "border-primary bg-primary/10"
                              : "border-border-light bg-white"
                          } ${status === "done" ? "cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          <label className="mb-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={batchReviewSelectedIndices.has(idx)}
                              disabled={batchReviewHandledIndices.has(idx)}
                              onChange={() => toggleBatchReviewSelection(idx)}
                            />
                            <span className="text-[11px] text-text-secondary-light">加入批量處理</span>
                          </label>
                          <div className="font-medium text-text-primary-light">#{idx + 1} {item.productCode || "無代碼"}</div>
                          <div className="mt-1 line-clamp-2 text-text-secondary-light">{item.payload?.title || "無標題"}</div>
                          <div className="mt-1 text-[11px] text-text-secondary-light">
                            {status === "done" ? "已處理" : status === "current" ? "處理中" : "待處理"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary-light">
                分類確認{isBatchReviewMode ? `（批次 ${batchReviewIndex + 1}/${batchReviewQueue.length}）` : ""}
              </h3>
              <button
                type="button"
                className="text-text-secondary-light"
                onClick={() => {
                  if (isBatchReviewMode) {
                    alert("批次分類確認進行中，請完成本輪確認。");
                    return;
                  }
                  setShowCategoryReview(false);
                  setPendingPublishPayload(null);
                  setPendingCategoryReview(null);
                  setMergeL2Id(null);
                  setMergeL3Id(null);
                }}
              >
                關閉
              </button>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <div>系統判定此商品分類需要確認。</div>
              <div className="mt-1 text-xs">
                風險標記：{Array.isArray(pendingCategoryReview.risk_flags) && pendingCategoryReview.risk_flags.length > 0
                  ? pendingCategoryReview.risk_flags.map((flag: string) => formatCategoryRiskFlag(flag)).join(", ")
                  : "無"}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <div className="rounded border border-border-light bg-background-light p-3">
                <div className="text-text-secondary-light">來源分類</div>
                <div className="mt-1 text-text-primary-light">ID：{pendingCategoryReview?.source?.source_category_id || "-"}</div>
                <div className="text-text-primary-light">名稱：{pendingCategoryReview?.source?.source_category_name || "-"}</div>
              </div>
              <div className="rounded border border-border-light bg-background-light p-3">
                <div className="text-text-secondary-light">預計分類</div>
                <div className="mt-1 text-text-primary-light">L1：{pendingCategoryReview?.proposed_category?.l1_id || "-"}</div>
                <div className="text-text-primary-light">L2：{pendingCategoryReview?.proposed_category?.l2_name || pendingCategoryReview?.proposed_category?.l2_id || "-"}</div>
                <div className="text-text-primary-light">L3：{pendingCategoryReview?.proposed_category?.l3_name || pendingCategoryReview?.proposed_category?.l3_id || "-"}</div>
              </div>
            </div>

            <div className="rounded border border-border-light p-3 space-y-3">
              <div className="text-sm font-medium text-text-primary-light">改為合併到既有分類（本次）</div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <div>
                  <label className="text-xs text-text-secondary-light">L2</label>
                  <select
                    value={mergeL2Id ?? ""}
                    onChange={(e) => {
                      setMergeL2Id(e.target.value ? Number(e.target.value) : null);
                      setMergeL3Id(null);
                    }}
                    className="mt-1 w-full rounded border border-border-light bg-background-light px-2 py-2 text-sm"
                  >
                    <option value="">請選擇 L2</option>
                    {categories
                      .filter((c) => c.level === 2)
                      .filter((l2) =>
                        categoryRelations.some(
                          (r: any) =>
                            r.parent_category_id === Number(pendingCategoryReview?.proposed_category?.l1_id || 0) &&
                            r.child_category_id === l2.id
                        )
                      )
                      .sort((a, b) => a.sort - b.sort)
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-secondary-light">L3（可選）</label>
                  <select
                    value={mergeL3Id ?? ""}
                    onChange={(e) => setMergeL3Id(e.target.value ? Number(e.target.value) : null)}
                    className="mt-1 w-full rounded border border-border-light bg-background-light px-2 py-2 text-sm"
                  >
                    <option value="">不指定</option>
                    {categories
                      .filter((c) => c.level === 3)
                      .filter((l3) => !mergeL2Id || categoryRelations.some((r: any) => r.parent_category_id === mergeL2Id && r.child_category_id === l3.id))
                      .sort((a, b) => a.sort - b.sort)
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={confirmPublishWithAutoCategory}
                disabled={publishing}
                className="rounded-lg border border-border-light px-4 py-2 text-sm text-text-primary-light"
              >
                {publishing
                  ? "上架中,請稍後..."
                  : isBatchReviewMode
                    ? `用預設分類（${Math.max(batchReviewSelectedIndices.size, 1)}）`
                    : "用預設分類"}
              </button>
              <button
                type="button"
                onClick={confirmPublishWithMergedCategory}
                disabled={publishing}
                className="rounded-lg bg-primary px-4 py-2 text-sm text-white"
              >
                {publishing
                  ? "上架中,請稍後..."
                  : isBatchReviewMode
                    ? `改成既有分類（${Math.max(batchReviewSelectedIndices.size, 1)}）`
                    : "改成既有分類"}
              </button>
            </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {(importLoading || batchPublishing || publishing) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-xl border border-border-light bg-card-light p-5 text-center space-y-3">
            <div className="text-lg font-bold text-text-primary-light">
              {importLoadingMode === "sync" ? "同步中, 請勿關閉視窗" : importLoadingMode === "import" ? "導入中, 請勿關閉視窗" : "處理中, 請勿關閉視窗"}
            </div>
            <div className="text-sm text-text-secondary-light">
              {importLoading
                ? importLoadingMessage || (importLoadingMode === "import" ? "正在導入中..." : `正在同步中:${currentSyncTargetUrl || importSession?.target_url || dosoTargetUrl.trim() || "-"}`)
                : batchPublishing || publishing
                  ? "上架中,請稍後..."
                  : "正在處理中..."}
            </div>
          </div>
        </div>
      )}

      {showBatchTranslate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border-light bg-card-light p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary-light">批量翻譯（中文）</h3>
              <button
                className="text-text-secondary-light"
                onClick={() => setShowBatchTranslate(false)}
                disabled={batchTranslating}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="rounded-lg border border-border-light bg-background-light p-3 text-sm text-text-secondary-light">
              會套用到目前全選商品（{selectedCrawlerProducts.size} 件）。
            </div>

            <div className="space-y-2 text-sm text-text-primary-light">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={batchTranslateTitle}
                  onChange={(e) => setBatchTranslateTitle(e.target.checked)}
                />
                <span>翻譯標題</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={batchTranslateDescription}
                  onChange={(e) => setBatchTranslateDescription(e.target.checked)}
                />
                <span>翻譯描述</span>
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBatchTranslate(false)}
                disabled={batchTranslating}
                className="rounded-lg border border-border-light px-4 py-2 text-sm"
              >
                取消
              </button>
              <button
                onClick={applyBatchTranslate}
                disabled={batchTranslating}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {batchTranslating ? "翻譯中..." : "開始翻譯"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBatchPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-4xl rounded-xl border border-border-light bg-card-light p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary-light">批量上架前設定</h3>
              <button
                type="button"
                className="text-text-secondary-light"
                onClick={() => setShowBatchPublishModal(false)}
                disabled={batchPublishing}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="rounded-lg border border-border-light bg-background-light p-3 text-sm text-text-secondary-light">
              <div className="font-medium text-text-primary-light">主分類國家</div>
              <div className="mt-2 grid gap-2 md:grid-cols-[100px_minmax(0,220px)] md:items-center">
                <label className="text-text-primary-light">L1</label>
                <select
                  value={publishL1Id ?? ""}
                  onChange={(e) => setPublishL1Id(e.target.value ? Number(e.target.value) : null)}
                  className="rounded border border-border-light bg-white px-3 py-2 text-sm text-text-primary-light"
                >
                  {l1Categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-text-primary-light">標籤（可多選）</label>
                <input
                  type="text"
                  placeholder="搜尋標籤..."
                  value={tagSearchTerm}
                  onChange={(e) => setTagSearchTerm(e.target.value)}
                  className="text-xs px-2 py-1 rounded border border-border-light bg-background-light"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-72 overflow-y-auto border border-border-light rounded-lg p-2 bg-background-light">
                <div>
                  <div className="text-xs font-bold text-text-secondary-light mb-2 sticky top-0 bg-background-light py-1 z-10 border-b border-border-light">品牌分類 (A1)</div>
                  <div className="space-y-1">
                    {tags
                      .filter((t) => (t.category === "A1") && (t.name.toLowerCase().includes(tagSearchTerm.toLowerCase()) || t.slug.toLowerCase().includes(tagSearchTerm.toLowerCase())))
                      .sort((a, b) => a.sort - b.sort)
                      .map((tag) => (
                        <label key={tag.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-card-light cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedCrawlerTags.includes(tag.id)}
                            onChange={(e) => {
                              setSelectedCrawlerTags((prev) =>
                                e.target.checked ? [...prev, tag.id] : prev.filter((id) => id !== tag.id)
                              );
                            }}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="text-sm text-text-primary-light">{tag.name}</span>
                        </label>
                      ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-text-secondary-light mb-2 sticky top-0 bg-background-light py-1 z-10 border-b border-border-light">商品屬性 (A2)</div>
                  <div className="space-y-1">
                    {tags
                      .filter((t) => (!t.category || t.category === "A2") && (t.name.toLowerCase().includes(tagSearchTerm.toLowerCase()) || t.slug.toLowerCase().includes(tagSearchTerm.toLowerCase())))
                      .sort((a, b) => a.sort - b.sort)
                      .map((tag) => (
                        <label key={tag.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-card-light cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedCrawlerTags.includes(tag.id)}
                            onChange={(e) => {
                              setSelectedCrawlerTags((prev) =>
                                e.target.checked ? [...prev, tag.id] : prev.filter((id) => id !== tag.id)
                              );
                            }}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="text-sm text-text-primary-light">{tag.name}</span>
                        </label>
                      ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-text-secondary-light mb-2 sticky top-0 bg-background-light py-1 z-10 border-b border-border-light">活動分類 (A3)</div>
                  <div className="space-y-1">
                    {tags
                      .filter((t) => (t.category === "A3") && (t.name.toLowerCase().includes(tagSearchTerm.toLowerCase()) || t.slug.toLowerCase().includes(tagSearchTerm.toLowerCase())))
                      .sort((a, b) => a.sort - b.sort)
                      .map((tag) => (
                        <label key={tag.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-card-light cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedCrawlerTags.includes(tag.id)}
                            onChange={(e) => {
                              setSelectedCrawlerTags((prev) =>
                                e.target.checked ? [...prev, tag.id] : prev.filter((id) => id !== tag.id)
                              );
                            }}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="text-sm text-text-primary-light">{tag.name}</span>
                        </label>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-text-secondary-light">將上架 {selectedCrawlerProducts.size} 件商品</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBatchPublishModal(false)}
                  disabled={batchPublishing}
                  className="rounded-lg border border-border-light px-4 py-2 text-sm text-text-primary-light"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => batchPublish(true)}
                  disabled={batchPublishing}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {batchPublishing ? "上架中,請稍後..." : `確認上架（${selectedCrawlerProducts.size}）`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBatchPriceAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-xl border border-border-light bg-card-light p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text-primary-light">批量調整價格</h3>
              <button className="text-text-secondary-light" onClick={() => setShowBatchPriceAdjust(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-border-light bg-background-light p-3 text-xs text-text-secondary-light">
                會套用到目前全選商品。預設值為批發 +8%、零售 +12%，可依品類再調整。
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBatchPriceAdjustMode("percentage");
                    setBatchPriceAdjustCost(0);
                    setBatchPriceAdjustWholesale(DEFAULT_WHOLESALE_ADJUST_PERCENT);
                    setBatchPriceAdjustRetail(DEFAULT_RETAIL_ADJUST_PERCENT);
                  }}
                  className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
                >
                  套用預設（批發 8%、零售 12%）
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBatchPriceAdjustCost(0);
                    setBatchPriceAdjustWholesale(0);
                    setBatchPriceAdjustRetail(0);
                  }}
                  className="rounded-lg border border-border-light bg-white px-3 py-1.5 text-xs font-medium text-text-secondary-light hover:bg-gray-50"
                >
                  清空調整
                </button>
              </div>

              {/* 調整方式 */}
              <div>
                <label className="block text-sm font-medium text-text-primary-light mb-2">調整方式</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="adjust-mode"
                      value="fixed"
                      checked={batchPriceAdjustMode === "fixed"}
                      onChange={(e) => setBatchPriceAdjustMode(e.target.value as any)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">固定金額 (NT$)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="adjust-mode"
                      value="percentage"
                      checked={batchPriceAdjustMode === "percentage"}
                      onChange={(e) => setBatchPriceAdjustMode(e.target.value as any)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">百分比 (%)</span>
                  </label>
                </div>
              </div>

              {/* 成本價調整 */}
              <div className="rounded-lg border border-border-light bg-background-light p-4">
                <label className="block text-sm font-medium text-text-primary-light mb-2">
                  成本價調整
                </label>
                <input
                  type="number"
                  step={batchPriceAdjustMode === "fixed" ? "1" : "0.1"}
                  value={batchPriceAdjustCost}
                  onChange={(e) => setBatchPriceAdjustCost(Number(e.target.value))}
                  placeholder={batchPriceAdjustMode === "fixed" ? "例：100" : "例：10"}
                  className="w-full rounded-lg border border-border-light bg-card-light px-3 py-2 text-sm"
                />
                <p className="mt-2 text-xs text-text-secondary-light">
                  {batchPriceAdjustMode === "fixed"
                    ? `${batchPriceAdjustCost >= 0 ? "增加" : "減少"} NT$${Math.abs(batchPriceAdjustCost)}`
                    : `${batchPriceAdjustCost >= 0 ? "增加" : "減少"} ${Math.abs(batchPriceAdjustCost)}%`}
                </p>
              </div>

              {/* 批發價調整 */}
              <div className="rounded-lg border border-border-light bg-background-light p-4">
                <label className="block text-sm font-medium text-text-primary-light mb-2">
                  批發價調整
                </label>
                <input
                  type="number"
                  step={batchPriceAdjustMode === "fixed" ? "1" : "0.1"}
                  value={batchPriceAdjustWholesale}
                  onChange={(e) => setBatchPriceAdjustWholesale(Number(e.target.value))}
                  placeholder={batchPriceAdjustMode === "fixed" ? "例：100" : "例：10"}
                  className="w-full rounded-lg border border-border-light bg-card-light px-3 py-2 text-sm"
                />
                <p className="mt-2 text-xs text-text-secondary-light">
                  {batchPriceAdjustMode === "fixed"
                    ? `${batchPriceAdjustWholesale >= 0 ? "增加" : "減少"} NT$${Math.abs(batchPriceAdjustWholesale)}`
                    : `${batchPriceAdjustWholesale >= 0 ? "增加" : "減少"} ${Math.abs(batchPriceAdjustWholesale)}%`}
                </p>
              </div>

              {/* 零售價調整 */}
              <div className="rounded-lg border border-border-light bg-background-light p-4">
                <label className="block text-sm font-medium text-text-primary-light mb-2">
                  零售價調整
                </label>
                <input
                  type="number"
                  step={batchPriceAdjustMode === "fixed" ? "1" : "0.1"}
                  value={batchPriceAdjustRetail}
                  onChange={(e) => setBatchPriceAdjustRetail(Number(e.target.value))}
                  placeholder={batchPriceAdjustMode === "fixed" ? "例：100" : "例：10"}
                  className="w-full rounded-lg border border-border-light bg-card-light px-3 py-2 text-sm"
                />
                <p className="mt-2 text-xs text-text-secondary-light">
                  {batchPriceAdjustMode === "fixed"
                    ? `${batchPriceAdjustRetail >= 0 ? "增加" : "減少"} NT$${Math.abs(batchPriceAdjustRetail)}`
                    : `${batchPriceAdjustRetail >= 0 ? "增加" : "減少"} ${Math.abs(batchPriceAdjustRetail)}%`}
                </p>
              </div>

              {/* 提示 */}
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                <p className="text-xs text-blue-900">
                  將對選中的 <span className="font-bold">{selectedCrawlerProducts.size}</span> 件商品進行價格調整。
                  {(batchPriceAdjustCost !== 0 || batchPriceAdjustWholesale !== 0 || batchPriceAdjustRetail !== 0) && (
                    <span>
                      <br />調整內容：
                      {batchPriceAdjustCost !== 0 && <span>成本價 {batchPriceAdjustMode === "fixed" ? `${batchPriceAdjustCost > 0 ? "+" : ""}${batchPriceAdjustCost}` : `${batchPriceAdjustCost > 0 ? "+" : ""}${batchPriceAdjustCost}%`}</span>}
                      {batchPriceAdjustCost !== 0 && batchPriceAdjustWholesale !== 0 && <span>、</span>}
                      {batchPriceAdjustWholesale !== 0 && <span>批發價 {batchPriceAdjustMode === "fixed" ? `${batchPriceAdjustWholesale > 0 ? "+" : ""}${batchPriceAdjustWholesale}` : `${batchPriceAdjustWholesale > 0 ? "+" : ""}${batchPriceAdjustWholesale}%`}</span>}
                      {(batchPriceAdjustCost !== 0 || batchPriceAdjustWholesale !== 0) && batchPriceAdjustRetail !== 0 && <span>、</span>}
                      {batchPriceAdjustRetail !== 0 && <span>零售價 {batchPriceAdjustMode === "fixed" ? `${batchPriceAdjustRetail > 0 ? "+" : ""}${batchPriceAdjustRetail}` : `${batchPriceAdjustRetail > 0 ? "+" : ""}${batchPriceAdjustRetail}%`}</span>}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowBatchPriceAdjust(false);
                  setBatchPriceAdjustCost(0);
                  setBatchPriceAdjustWholesale(0);
                  setBatchPriceAdjustRetail(0);
                }}
                className="px-4 py-2 rounded-lg border border-border-light text-sm font-medium text-text-primary-light hover:bg-background-light"
              >
                取消
              </button>
              <button
                onClick={applyBatchPriceAdjust}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90"
              >
                確認調整
              </button>
            </div>
          </div>
        </div>
      )}

      {showBatchImageEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-5xl rounded-xl border border-border-light bg-card-light p-6 h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-text-primary-light">批量圖片編輯</h3>
                <p className="text-sm text-text-secondary-light">調整所選商品的圖片用途（商品圖/描述圖）及順序</p>
              </div>
              <button className="text-text-secondary-light" onClick={() => setShowBatchImageEditor(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {Array.from(selectedCrawlerProducts).map((idx) => {
                const p = crawlerFiltered[idx];
                if (!p) return null;
                const images = p._images || [];

                return (
                  <div key={idx} className="border border-border-light rounded-lg p-4 bg-background-light">
                    <div className="flex justify-between mb-3">
                      <div className="font-bold text-text-primary-light">{p.title}</div>
                      <div className="text-sm text-text-secondary-light">{p.productCode}</div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                      {images.map((img: any, imgIdx: number) => (
                        <div key={imgIdx} className="flex flex-col gap-2 p-2 border border-border-light rounded bg-white">
                          <div className="aspect-square w-full relative">
                            <img src={img.url} alt="" className="w-full h-full object-cover rounded" />
                          </div>
                          <div className="space-y-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={img.isProduct}
                                onChange={() => updateBatchImage(idx, imgIdx, 'isProduct')}
                                className="w-3 h-3 rounded border-gray-300 text-primary"
                              />
                              <span className="text-xs">商品圖</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={img.isDescription}
                                onChange={() => updateBatchImage(idx, imgIdx, 'isDescription')}
                                className="w-3 h-3 rounded border-gray-300 text-primary"
                              />
                              <span className="text-xs">描述圖</span>
                            </label>
                          </div>
                          <div className="flex justify-center gap-2 border-t border-border-light pt-1">
                            <button
                              onClick={() => moveBatchImage(idx, imgIdx, -1)}
                              disabled={imgIdx === 0}
                              className="text-text-secondary-light hover:text-primary disabled:opacity-30"
                            >
                              <span className="material-symbols-outlined text-base">arrow_left</span>
                            </button>
                            <button
                              onClick={() => moveBatchImage(idx, imgIdx, 1)}
                              disabled={imgIdx === images.length - 1}
                              className="text-text-secondary-light hover:text-primary disabled:opacity-30"
                            >
                              <span className="material-symbols-outlined text-base">arrow_right</span>
                            </button>
                          </div>
                        </div>
                      ))}
                      {images.length === 0 && <div className="col-span-full text-center text-sm text-text-secondary-light">無圖片</div>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-border-light flex justify-end">
              <button
                onClick={() => setShowBatchImageEditor(false)}
                className="px-6 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90"
              >
                完成編輯
              </button>
            </div>
          </div>
        </div>
      )}

      {/* XLSX CDN */}
      <Script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js" strategy="afterInteractive" />
    </div>
  );
}
