import { useState, useEffect } from "react";
import Script from "next/script";
import { supabase } from "@/lib/supabase";

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
  const [tagSearchTerm, setTagSearchTerm] = useState("");

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
      
      const _images = images.map((url: string) => ({
        url,
        isProduct: true,
        isDescription: false
      }));

      return {
        productCode: it.productCode || it.code || it.sku || it.id || "無代碼",
        title: it.title || it.name || "無標題",
        description: it.description || it.desc || "",
        wholesalePriceJPY: it.wholesalePriceJPY || it.priceJPY || it.price_jpy || it.jpy || null,
        wholesalePriceKRW: it.wholesalePriceKRW || it.priceKRW || it.price_krw || it.krw || null,
        wholesalePriceTWD: it.wholesalePriceTWD || it.priceTWD || it.twd || null,
        url: it.url || it.link || null,
        images,
        _images,
      };
    });
    setCrawlerProducts(mapped);
    setCrawlerFiltered(applyFilterSort(mapped));
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
      l1Id: selectedCrawlerL1,
      l2Id: selectedCrawlerL2,
      l3Id: selectedCrawlerL3,
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
        image_urls: candidateImages.filter(i => i.isProduct).map(i => i.url),
        original_url: publishTarget?.url || null,
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

    if (!confirm(`確定要上架選中的 ${selectedCrawlerProducts.size} 件商品嗎？`)) return;

    setBatchPublishing(true);
    let successCount = 0;
    let failCount = 0;

    const toInt = (v: any) =>
      v === null || v === undefined || v === "" ? null : Math.floor(Number(v));

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
        category_ids: [selectedCrawlerL1, selectedCrawlerL2, selectedCrawlerL3].filter(Boolean),
        tag_ids: selectedCrawlerTags,
        image_urls: image_urls,
        original_url: p.url || null,
      };

      try {
        const res = await fetch("/api/publish-product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) successCount++;
        else failCount++;
      } catch (err) {
        failCount++;
      }
    }

    setBatchPublishing(false);
    alert(`批量上架完成\n成功：${successCount}\n失敗：${failCount}`);
    // Clear selection
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-60 overflow-y-auto border border-border-light rounded-lg p-2 bg-background-light">
            {/* A1: Brand */}
            <div>
              <div className="text-xs font-bold text-text-secondary-light mb-2 sticky top-0 bg-background-light py-1 z-10 border-b border-border-light">品牌分類 (A1)</div>
              <div className="space-y-1">
                {tags
                  .filter(t => (t.category === 'A1') && (t.name.toLowerCase().includes(tagSearchTerm.toLowerCase()) || t.slug.toLowerCase().includes(tagSearchTerm.toLowerCase())))
                  .sort((a, b) => a.sort - b.sort)
                  .map(tag => (
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
            {/* A2: Attributes */}
            <div>
              <div className="text-xs font-bold text-text-secondary-light mb-2 sticky top-0 bg-background-light py-1 z-10 border-b border-border-light">商品屬性 (A2)</div>
              <div className="space-y-1">
                {tags
                  .filter(t => (!t.category || t.category === 'A2') && (t.name.toLowerCase().includes(tagSearchTerm.toLowerCase()) || t.slug.toLowerCase().includes(tagSearchTerm.toLowerCase())))
                  .sort((a, b) => a.sort - b.sort)
                  .map(tag => (
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
            {/* A3: Activity */}
            <div>
              <div className="text-xs font-bold text-text-secondary-light mb-2 sticky top-0 bg-background-light py-1 z-10 border-b border-border-light">活動分類 (A3)</div>
              <div className="space-y-1">
                {tags
                  .filter(t => (t.category === 'A3') && (t.name.toLowerCase().includes(tagSearchTerm.toLowerCase()) || t.slug.toLowerCase().includes(tagSearchTerm.toLowerCase())))
                  .sort((a, b) => a.sort - b.sort)
                  .map(tag => (
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
                onClick={() => setShowBatchImageEditor(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm font-medium text-text-primary-light hover:bg-primary/10"
              >
                <span className="material-symbols-outlined text-base">collections</span>
                批量圖片編輯
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
