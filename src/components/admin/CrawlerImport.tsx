import { useState, useEffect } from "react";
import Script from "next/script";

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
}

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
  const [selectedCrawlerL1, setSelectedCrawlerL1] = useState<number | null>(null);
  const [selectedCrawlerL2, setSelectedCrawlerL2] = useState<number | null>(null);
  const [selectedCrawlerL3, setSelectedCrawlerL3] = useState<number | null>(null);
  const [selectedCrawlerTags, setSelectedCrawlerTags] = useState<number[]>([]);

  const [showPublish, setShowPublish] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishTarget, setPublishTarget] = useState<any>(null);
  const [selectedCrawlerProducts, setSelectedCrawlerProducts] = useState<Set<number>>(new Set());
  const [showBatchPriceAdjust, setShowBatchPriceAdjust] = useState(false);
  const [batchPriceAdjustMode, setBatchPriceAdjustMode] = useState<"fixed" | "percentage">("fixed");
  const [batchPriceAdjustCost, setBatchPriceAdjustCost] = useState(0);
  const [batchPriceAdjustWholesale, setBatchPriceAdjustWholesale] = useState(0);
  const [batchPriceAdjustRetail, setBatchPriceAdjustRetail] = useState(0);
  const [batchPublishing, setBatchPublishing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [publishForm, setPublishForm] = useState({
    sku: "",
    title: "",
    description: "",
    cost_twd: 0,
    wholesale_price_twd: 0,
    retail_price_twd: 0,
    l1Id: null as number | null,
    l2Id: null as number | null,
    l3Id: null as number | null,
    image_urls: [] as string[],
  });

  useEffect(() => {
    fetchCategories();
    fetchTags();
    fetchCategoryRelations();
    
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
    // 當 L1 改變時重置 L2/L3
    setSelectedCrawlerL2(null);
    setSelectedCrawlerL3(null);
  }, [selectedCrawlerL1]);

  useEffect(() => {
    // 當 L2 改變時重置 L3
    setSelectedCrawlerL3(null);
  }, [selectedCrawlerL2]);

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
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.toLowerCase();
    if (name.endsWith(".json")) {
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        parseJson(data);
      } catch (err) {
        alert("JSON 解析失敗");
      }
    } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
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
  };

  const parseJson = (input: any) => {
    const arr = Array.isArray(input) ? input : [input];
    const mapped = arr.map((it: any) => {
      const images = Array.isArray(it.images)
        ? it.images
        : Array.isArray(it.imgs)
          ? it.imgs
          : Array.isArray(it.imageUrls)
            ? it.imageUrls
            : it.image
              ? [it.image]
              : [];
      return {
        productCode: it.productCode || it.code || it.sku || it.id || "無代碼",
        title: it.title || it.name || "無標題",
        description: it.description || it.desc || "",
        wholesalePriceJPY: it.wholesalePriceJPY || it.priceJPY || it.price_jpy || it.jpy || null,
        wholesalePriceKRW: it.wholesalePriceKRW || it.priceKRW || it.price_krw || it.krw || null,
        wholesalePriceTWD: it.wholesalePriceTWD || it.priceTWD || it.twd || null,
        url: it.url || it.link || null,
        images,
      };
    });
    setCrawlerProducts(mapped);
    setCrawlerFiltered(applyFilterSort(mapped));
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
      l1Id: selectedCrawlerL1,
      l2Id: selectedCrawlerL2,
      l3Id: selectedCrawlerL3,
      image_urls: Array.isArray(p.images) ? [...p.images] : [],
    });
    setShowPublish(true);
  };

  const moveImage = (idx: number, dir: -1 | 1) => {
    setPublishForm((prev) => {
      const arr = [...prev.image_urls];
      const to = idx + dir;
      if (to < 0 || to >= arr.length) return prev;
      const tmp = arr[idx];
      arr[idx] = arr[to];
      arr[to] = tmp;
      return { ...prev, image_urls: arr };
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

  const toggleImage = (url: string) => {
    setPublishForm((prev) => {
      const arr = new Set(prev.image_urls);
      if (arr.has(url)) arr.delete(url); else arr.add(url);
      return { ...prev, image_urls: Array.from(arr) };
    });
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

  const publishNow = async () => {
    try {
      setPublishing(true);
      const toInt = (v: any) =>
        v === null || v === undefined || v === "" ? null : Math.floor(Number(v));
      const category_ids = [
        publishForm.l1Id,
        publishForm.l2Id,
        publishForm.l3Id,
      ].filter(Boolean) as number[];
      const payload = {
        sku: publishForm.sku,
        title: publishForm.title,
        description: publishForm.description,
        cost_twd: toInt(publishForm.cost_twd),
        wholesale_price_twd: toInt(publishForm.wholesale_price_twd),
        retail_price_twd: toInt(publishForm.retail_price_twd),
        status: "published",
        category_ids,
        tag_ids: selectedCrawlerTags,
        image_urls: publishForm.image_urls,
      };
      if (!payload.sku || !payload.title) {
        alert("請填寫 SKU 與標題");
        return;
      }
      const res = await fetch("/api/publish-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        alert("上架成功");
        setShowPublish(false);
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || "上架失敗");
      }
    } finally {
      setPublishing(false);
    }
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

  const batchPublish = async () => {
    if (selectedCrawlerProducts.size === 0) {
      alert("請先選擇商品");
      return;
    }

    if (!selectedCrawlerL1 || !selectedCrawlerL2) {
      alert("請先選擇分類（至少需要 L1 和 L2）");
      return;
    }

    if (!confirm(`確定要上架 ${selectedCrawlerProducts.size} 件商品嗎？`)) return;

    try {
      setBatchPublishing(true);
      const toInt = (v: any) => (v === null || v === undefined || v === "" ? null : Math.floor(Number(v)));
      const category_ids = [selectedCrawlerL1, selectedCrawlerL2, selectedCrawlerL3].filter(Boolean) as number[];

      let successCount = 0;
      let failCount = 0;

      for (const idx of Array.from(selectedCrawlerProducts).sort((a, b) => a - b)) {
        const p = crawlerFiltered[idx];
        const costTwd = Math.floor(Number(getPriceTWD(p) || 0));

        let wholesaleTwd = Math.floor(costTwd * 1.25);
        let retailTwd = Math.floor(costTwd * 1.35);

        if (p._wholesaleAdjust !== undefined && p._wholesaleAdjust !== 0) {
          if (p._adjustMode === "fixed") {
            wholesaleTwd = wholesaleTwd + p._wholesaleAdjust;
          } else {
            wholesaleTwd = Math.floor(wholesaleTwd * (1 + p._wholesaleAdjust / 100));
          }
        }

        if (p._retailAdjust !== undefined && p._retailAdjust !== 0) {
          if (p._adjustMode === "fixed") {
            retailTwd = retailTwd + p._retailAdjust;
          } else {
            retailTwd = Math.floor(retailTwd * (1 + p._retailAdjust / 100));
          }
        }

        const payload = {
          sku: `${p.productCode}-${Date.now()}`,
          title: p.title,
          description: p.description || "",
          cost_twd: costTwd,
          wholesale_price_twd: wholesaleTwd,
          retail_price_twd: retailTwd,
          status: "published",
          category_ids,
          tag_ids: selectedCrawlerTags,
          image_urls: Array.isArray(p.images) ? [...p.images] : [],
        };

        const res = await fetch("/api/publish-product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      }

      alert(`上架完成：成功 ${successCount} 件，失敗 ${failCount} 件`);
      setSelectedCrawlerProducts(new Set());
    } finally {
      setBatchPublishing(false);
    }
  };

  return (
    <div className="py-6 space-y-6">
      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <input id="crawler-file" type="file" accept=".json,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
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

      {/* 上架前：預設分類與標籤 */}
      <div className="rounded-xl border border-border-light bg-card-light p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-text-primary-light">上架前：預設分類與標籤</h3>
            <p className="text-xs text-text-secondary-light mt-1">必須選擇 L1 和 L2，L3 可選</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-primary-light mb-1">L1</label>
            <select
              value={selectedCrawlerL1 ?? ""}
              onChange={(e) => setSelectedCrawlerL1(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
            >
              <option value="">未選擇</option>
              {categories
                .filter((c) => c.level === 1)
                .sort((a, b) => a.sort - b.sort)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.slug})
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary-light mb-1">L2</label>
            <select
              value={selectedCrawlerL2 ?? ""}
              onChange={(e) => setSelectedCrawlerL2(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
            >
              <option value="">未選擇</option>
              {categories
                .filter((c) => c.level === 2)
                .filter((l2) => !selectedCrawlerL1 || categoryRelations.some((r: any) => r.parent_category_id === selectedCrawlerL1 && r.child_category_id === l2.id))
                .sort((a, b) => a.sort - b.sort)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.slug})
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary-light mb-1">L3</label>
            <select
              value={selectedCrawlerL3 ?? ""}
              onChange={(e) => setSelectedCrawlerL3(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
            >
              <option value="">未選擇</option>
              {categories
                .filter((c) => c.level === 3)
                .filter((l3) => !selectedCrawlerL2 || categoryRelations.some((r: any) => r.parent_category_id === selectedCrawlerL2 && r.child_category_id === l3.id))
                .sort((a, b) => a.sort - b.sort)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.slug})
                  </option>
                ))}
            </select>
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium text-text-primary-light mb-2">標籤（可多選）</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {tags
              .sort((a, b) => a.sort - b.sort)
              .map((tag) => (
                <label key={tag.id} className="flex items-center gap-2 rounded-lg border border-border-light bg-background-light px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedCrawlerTags.includes(tag.id)}
                    onChange={(e) => {
                      setSelectedCrawlerTags((prev) =>
                        e.target.checked ? [...prev, tag.id] : prev.filter((id) => id !== tag.id)
                      );
                    }}
                  />
                  <span className="text-sm text-text-primary-light">{tag.name}</span>
                  <span className="text-xs text-text-secondary-light">{tag.slug}</span>
                </label>
              ))}
            {tags.length === 0 && <p className="text-sm text-text-secondary-light">
              尚無標籤
            </p>}
          </div>
        </div>
      </div>

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

          {selectedCrawlerProducts.size > 0 && (
            <>
              <div className="h-6 w-px bg-border-light"></div>
              <button
                onClick={() => setShowBatchPriceAdjust(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm font-medium text-text-primary-light hover:bg-primary/10"
              >
                <span className="material-symbols-outlined text-base">price_change</span>
                批量調整價格
              </button>
              <button
                onClick={batchPublish}
                disabled={batchPublishing}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">cloud_upload</span>
                批量上架 ({selectedCrawlerProducts.size})
              </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-3xl rounded-xl border border-border-light bg-card-light p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary-light">上架商品</h3>
              <button className="text-text-secondary-light" onClick={() => setShowPublish(false)}>關閉</button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* 左：圖片與排序 */}
              <div>
                <div className="text-sm font-medium mb-2">圖片（可調整順序/勾選要上架的圖）</div>
                <div className="space-y-3 max-h-[50vh] overflow-auto pr-1">
                  {publishForm.image_urls.map((url, i) => (
                    <div key={url} className="flex items-center gap-2">
                      <input type="checkbox" checked={publishForm.image_urls.includes(url)} onChange={() => toggleImage(url)} />
                      <img src={url} alt="img" className="h-14 w-14 object-cover border border-border-light" />
                      <div className="ml-auto flex gap-1">
                        <button className="px-2 py-1 border border-border-light text-xs" onClick={() => moveImage(i, -1)}>上移</button>
                        <button className="px-2 py-1 border border-border-light text-xs" onClick={() => moveImage(i, +1)}>下移</button>
                      </div>
                    </div>
                  ))}
                  {publishForm.image_urls.length === 0 && (
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
                {/* 分類選擇 */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-sm text-text-secondary-light">L1</label>
                    <select value={publishForm.l1Id ?? ""} onChange={(e) => setPublishForm({ ...publishForm, l1Id: e.target.value ? Number(e.target.value) : null, l2Id: null, l3Id: null })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm">
                      <option value="">未選擇</option>
                      {categories.filter(c => c.level === 1).sort((a, b) => a.sort - b.sort).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-text-secondary-light">L2</label>
                    <select value={publishForm.l2Id ?? ""} onChange={(e) => setPublishForm({ ...publishForm, l2Id: e.target.value ? Number(e.target.value) : null, l3Id: null })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm">
                      <option value="">未選擇</option>
                      {categories.filter(c => c.level === 2)
                        .filter(l2 => !publishForm.l1Id || categoryRelations.some((r: any) => r.parent_category_id === publishForm.l1Id && r.child_category_id === l2.id))
                        .sort((a, b) => a.sort - b.sort)
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-text-secondary-light">L3</label>
                    <select value={publishForm.l3Id ?? ""} onChange={(e) => setPublishForm({ ...publishForm, l3Id: e.target.value ? Number(e.target.value) : null })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm">
                      <option value="">未選擇</option>
                      {categories.filter(c => c.level === 3)
                        .filter(l3 => !publishForm.l2Id || categoryRelations.some((r: any) => r.parent_category_id === publishForm.l2Id && r.child_category_id === l3.id))
                        .sort((a, b) => a.sort - b.sort)
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                  </div>
                </div>
                {/* 標籤選擇（共用選擇狀態） */}
                <div>
                  <div className="text-sm text-text-secondary-light mb-1">標籤</div>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((t) => (
                      <label key={t.id} className="inline-flex items-center gap-1 text-sm">
                        <input type="checkbox" checked={selectedCrawlerTags.includes(t.id)} onChange={(e) => {
                          if (e.target.checked) setSelectedCrawlerTags([...selectedCrawlerTags, t.id]);
                          else setSelectedCrawlerTags(selectedCrawlerTags.filter(x => x !== t.id));
                        }} />
                        <span>{t.name}</span>
                      </label>
                    ))}
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

      {/* XLSX CDN */}
      <Script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js" strategy="afterInteractive" />
    </div>
  );
}
