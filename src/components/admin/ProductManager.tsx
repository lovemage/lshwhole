import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface ProductImage {
  url: string;
  sort: number;
  is_product?: boolean;
  is_description?: boolean;
}

interface Product {
  id: number;
  sku: string;
  title_zh: string;
  title_original: string;
  desc_zh?: string;
  desc_original?: string;
  retail_price_twd: number;
  wholesale_price_twd: number | null;
  cost_twd?: number | null;
  cover_image_url?: string | null;
  status: string;
  tags?: { id: number; name: string; category?: string }[];
}

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

export default function ProductManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedProductL1, setSelectedProductL1] = useState<number | null>(null);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productPage, setProductPage] = useState(0);
  const [productTotal, setProductTotal] = useState(0);
  const pageSize = 20;
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [showProductEdit, setShowProductEdit] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productEditForm, setProductEditForm] = useState({
    sku: "",
    title_zh: "",
    title_original: "",
    desc_zh: "",
    desc_original: "",
    retail_price_twd: 0,
    wholesale_price_twd: 0,
    cost_twd: 0,
    status: "draft" as "draft" | "published",
    images: [] as ProductImage[],
  });
  
  // Spec & Variant Management
  interface Spec {
    name: string;
    values: string[];
  }
  interface Variant {
    id: string; // temp ID or real ID
    options: Record<string, string>;
    price: number;
    stock: number;
    sku: string;
  }
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);

  // 規格範本
  interface SpecTemplate {
    id: string;
    name: string;
    specs: Spec[];
  }
  const [specTemplates, setSpecTemplates] = useState<SpecTemplate[]>([]);

  const [isTranslating, setIsTranslating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchProducts(0, null);
    fetchSpecTemplates();
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

  // Helper to ensure HTTPS URLs
  const ensureHttps = (url: string) => {
    if (!url) return url;
    return url.replace(/^http:/, 'https:');
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

  const fetchProducts = async (page: number = 0, l1Id: number | null = null) => {
    try {
      setProductsLoading(true);
      const offset = page * pageSize;
      let url = `/api/products?limit=${pageSize}&offset=${offset}`;

      if (productSearch) {
        url += `&search=${encodeURIComponent(productSearch)}`;
      }

      if (l1Id) {
        url += `&category_id=${l1Id}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const result = await res.json();
        setProducts(result.data || []);
        setProductTotal(result.count || 0);
        setProductPage(page);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setProductsLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedProductIds.length === products.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(products.map((p) => p.id));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const batchUpdateStatus = async (newStatus: "draft" | "published") => {
    if (selectedProductIds.length === 0) return alert("請先選擇商品");
    const res = await fetch("/api/products/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status", ids: selectedProductIds, status: newStatus }),
    });
    if (res.ok) {
      setSelectedProductIds([]);
      fetchProducts(productPage, selectedProductL1);
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "操作失敗");
    }
  };

  const batchDelete = async () => {
    if (selectedProductIds.length === 0) return alert("請先選擇商品");
    if (!confirm(`確定刪除選取的 ${selectedProductIds.length} 件商品？`)) return;
    const res = await fetch("/api/products/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", ids: selectedProductIds }),
    });
    if (res.ok) {
      setSelectedProductIds([]);
      fetchProducts(productPage, selectedProductL1);
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "刪除失敗");
    }
  };

  const openAddProduct = () => {
    setEditingProduct(null);
    setProductEditForm({
      sku: "",
      title_zh: "",
      title_original: "",
      desc_zh: "",
      desc_original: "",
      retail_price_twd: 0,
      wholesale_price_twd: 0,
      cost_twd: 0,
      status: "draft",
      images: [],
    });
    setSpecs([]);
    setVariants([]);
    setShowProductEdit(true);
  };

  const openEditProduct = async (p: Product) => {
    setEditingProduct(p);
    setSpecs([]);
    setVariants([]);

    // Fetch product images and details (specs, variants)
    let images: ProductImage[] = [];
    let fetchedSpecs: Spec[] = [];
    let fetchedVariants: Variant[] = [];

    try {
      const res = await fetch(`/api/products/${p.id}`);
      if (res.ok) {
        const productData = await res.json();
        // Handle both array of strings (old) and array of objects (new)
        images = (productData.images || []).map((img: ProductImage, idx: number) => {
          if (typeof img === 'string') {
            return { url: img, sort: idx, is_product: true, is_description: false };
          }
          return {
            url: img.url,
            sort: img.sort ?? idx,
            is_product: img.is_product ?? true,
            is_description: img.is_description ?? false,
          };
        });
        fetchedSpecs = productData.specs || [];
        fetchedVariants = (productData.variants || []).map((v: Variant) => ({
          id: v.id,
          options: v.options,
          price: v.price,
          stock: v.stock,
          sku: v.sku
        }));
      }
    } catch (err) {
      console.error("Failed to fetch product details:", err);
    }

    setProductEditForm({
      sku: p.sku || "",
      title_zh: p.title_zh || "",
      title_original: p.title_original || "",
      desc_zh: p.desc_zh || "",
      desc_original: p.desc_original || "",
      retail_price_twd: Number(p.retail_price_twd || 0),
      wholesale_price_twd: Number(p.wholesale_price_twd || 0),
      cost_twd: Number(p.cost_twd || 0),
      status: (p.status === "published" ? "published" : "draft") as "draft" | "published",
      images: images,
    });
    setSpecs(fetchedSpecs);
    setVariants(fetchedVariants);
    setShowProductEdit(true);
  };

  const handleTranslate = async (field: "title" | "description") => {
    const text = field === "title" ? productEditForm.title_original : productEditForm.desc_original;
    if (!text) return alert("無原文內容可翻譯");

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
          setProductEditForm(prev => ({
            ...prev,
            [field === "title" ? "title_zh" : "desc_zh"]: data.translatedText
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

  const recalculateEditPrices = () => {
    const costTwd = productEditForm.cost_twd;
    if (costTwd <= 0) {
      alert("請先設定成本價格");
      return;
    }
    const wholesaleTwd = Math.floor(costTwd * 1.25);
    const retailTwd = Math.floor(costTwd * 1.35);

    setProductEditForm(prev => ({
      ...prev,
      wholesale_price_twd: wholesaleTwd,
      retail_price_twd: retailTwd
    }));
  };

  // Spec Helpers (Copied from CrawlerImport)
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
    const combine = (acc: Record<string, string>[], specIdx: number): Record<string, string>[] => {
      if (specIdx === currentSpecs.length) return acc;

      const spec = currentSpecs[specIdx];
      if (spec.values.length === 0) return combine(acc, specIdx + 1); // Skip empty specs

      const nextAcc: Record<string, string>[] = [];
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
        id: "temp-" + Date.now() + "-" + i,
        options: opts,
        price: productEditForm.retail_price_twd,
        stock: 10,
        sku: `${productEditForm.sku}-${i + 1}`
      };
    });

    setVariants(newVariants);
  };

    const updateVariant = (idx: number, field: keyof Variant, value: string | number | Record<string, string>) => {
    const newVariants = [...variants];
    newVariants[idx] = { ...newVariants[idx], [field]: value };
    setVariants(newVariants);
  };

  const saveEditProduct = async () => {
    // 價格強制為整數
    const toInt = (v: string | number | null | undefined) => (v === null || v === undefined || v === "" ? null : Math.floor(Number(v)));
    
    // Prepare images payload
    const imagesPayload = productEditForm.images.map((img, idx) => ({
      url: img.url,
      sort: idx, // Ensure sort order follows array order
      is_product: img.is_product, // Note: backend currently only stores url and sort
      is_description: img.is_description
    }));

    const payload = {
      sku: productEditForm.sku,
      title_zh: productEditForm.title_zh,
      title_original: productEditForm.title_original,
      desc_zh: productEditForm.desc_zh,
      desc_original: productEditForm.desc_original,
      retail_price_twd: toInt(productEditForm.retail_price_twd),
      wholesale_price_twd: toInt(productEditForm.wholesale_price_twd),
      cost_twd: toInt(productEditForm.cost_twd),
      status: productEditForm.status,
      images: imagesPayload,
      specs: specs,
      variants: variants.map(v => ({
        name: Object.values(v.options).join(" / "),
        options: v.options,
        price: toInt(v.price),
        stock: toInt(v.stock),
        sku: v.sku
      }))
    };

    let res;
    if (editingProduct) {
      res = await fetch(`/api/products/${editingProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    if (res.ok) {
      setShowProductEdit(false);
      setEditingProduct(null);
      fetchProducts(productPage, selectedProductL1);
      alert(editingProduct ? "保存成功" : "新增成功");
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "保存失敗");
    }
  };

  const deleteProduct = async (id: number) => {
    if (!confirm("確定刪除此商品？")) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchProducts(productPage, selectedProductL1);
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "刪除失敗");
    }
  };

  return (
    <div className="py-6 space-y-6">
      {/* 標題 */}
      <h2 className="text-2xl font-bold text-text-primary-light">商品管理</h2>

      {/* L1 分類分頁標籤 */}
      <div className="flex gap-2 border-b border-border-light overflow-x-auto pb-2">
        <button
          onClick={() => {
            setSelectedProductL1(null);
            setProductPage(0);
            fetchProducts(0, null);
          }}
          className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${selectedProductL1 === null
            ? "border-primary text-primary"
            : "border-transparent text-text-secondary-light hover:text-text-primary-light"
            }`}
        >
          全部
        </button>
        {categories
          .filter((c) => c.level === 1)
          .sort((a, b) => a.sort - b.sort)
          .map((l1) => (
            <button
              key={l1.id}
              onClick={() => {
                setSelectedProductL1(l1.id);
                setProductPage(0);
                fetchProducts(0, l1.id);
              }}
              className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${selectedProductL1 === l1.id
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary-light hover:text-text-primary-light"
                }`}
            >
              {l1.name}
            </button>
          ))}
      </div>

      {/* 搜尋欄 */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="搜尋商品代碼或名稱..."
          value={productSearch}
          onChange={(e) => {
            setProductSearch(e.target.value);
            setProductPage(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              fetchProducts(0, selectedProductL1);
            }
          }}
          className="flex-1 rounded-lg border border-border-light bg-background-light px-4 py-2 text-sm"
        />
        <button
          onClick={() => fetchProducts(0, selectedProductL1)}
          className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90"
        >
          搜尋
        </button>
        <button
          onClick={openAddProduct}
          className="px-4 py-2 rounded-lg bg-success text-white font-medium hover:bg-success/90"
        >
          新增商品
        </button>
      </div>

      {/* 工具列：批量操作 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary-light">已選 {selectedProductIds.length} 項</p>
        <div className="flex gap-2">
          <button onClick={() => batchUpdateStatus('published')} className="px-3 py-1 rounded-lg border border-border-light text-sm hover:bg-background-light">批量上架</button>
          <button onClick={() => batchUpdateStatus('draft')} className="px-3 py-1 rounded-lg border border-border-light text-sm hover:bg-background-light">批量下架</button>
          <button onClick={batchDelete} className="px-3 py-1 rounded-lg border border-danger text-danger text-sm hover:bg-danger/10">批量刪除</button>
        </div>
      </div>

      {/* 商品表格 */}
      <div className="rounded-xl border border-border-light bg-card-light overflow-hidden">
        <table className="w-full">
          <thead className="bg-background-light border-b border-border-light">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">
                <input type="checkbox" checked={selectedProductIds.length === products.length && products.length > 0} onChange={toggleSelectAll} />
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">縮圖</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">商品代碼</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">商品名稱</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">品牌/標籤</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">零售價</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">批發價</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">狀態</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">操作</th>
            </tr>
          </thead>
          <tbody>
            {productsLoading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-text-secondary-light">
                  載入中...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-text-secondary-light">
                  暫無商品
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const brandTag = product.tags?.find((t) => t.category === 'A1');
                const otherTags = product.tags?.filter((t) => t.category !== 'A1').slice(0, 2) || [];
                return (
                  <tr key={product.id} className="border-b border-border-light hover:bg-background-light">
                    <td className="px-4 py-3 text-sm"><input type="checkbox" checked={selectedProductIds.includes(product.id)} onChange={() => toggleSelectOne(product.id)} /></td>
                    <td className="px-4 py-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {product.cover_image_url ? (
                          <img src={product.cover_image_url} alt={product.sku} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">無圖</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary-light">{product.sku}</td>
                    <td className="px-4 py-3 text-sm text-text-primary-light max-w-[200px]">
                      <div className="line-clamp-2">{product.title_zh || product.title_original || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-col gap-1">
                        {brandTag && (
                          <span className="inline-block px-2 py-0.5 rounded-md bg-[#FFF8E1] text-[#F59E0B] text-xs font-medium border border-[#F59E0B]/20 whitespace-nowrap">
                            {brandTag.name}
                          </span>
                        )}
                        {otherTags.map((t) => (
                          <span key={t.id} className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs whitespace-nowrap">
                            {t.name}
                          </span>
                        ))}
                        {!brandTag && otherTags.length === 0 && <span className="text-gray-400 text-xs">-</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary-light">NT${Number(product.retail_price_twd || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-text-primary-light">NT${Number(product.wholesale_price_twd || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.status === 'published'
                        ? "bg-success/20 text-success"
                        : "bg-danger/20 text-danger"
                        }`}>
                        {product.status === 'published' ? "上架" : "草稿"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-3">
                        <button className="text-primary hover:underline" onClick={() => openEditProduct(product)}>編輯</button>
                        <button className="text-danger hover:underline" onClick={() => deleteProduct(product.id)}>刪除</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 編輯商品 Modal */}
      {showProductEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-xl rounded-xl border border-border-light bg-card-light p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary-light">{editingProduct ? "編輯商品" : "新增商品"}</h3>
              <button onClick={() => setShowProductEdit(false)} className="text-text-secondary-light">關閉</button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm text-text-secondary-light">SKU</label>
                <input value={productEditForm.sku} onChange={(e) => setProductEditForm({ ...productEditForm, sku: e.target.value })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-text-secondary-light">商品名稱 (中文)</label>
                <div className="flex gap-2">
                  <input value={productEditForm.title_zh} onChange={(e) => setProductEditForm({ ...productEditForm, title_zh: e.target.value })} className="mt-1 flex-1 rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                  <button 
                    onClick={() => handleTranslate("title")} 
                    disabled={isTranslating || !productEditForm.title_original}
                    className="mt-1 px-3 rounded-lg border border-primary text-primary text-xs hover:bg-primary/10 disabled:opacity-50"
                  >
                    翻譯
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm text-text-secondary-light">商品名稱 (原文)</label>
                <input value={productEditForm.title_original} onChange={(e) => setProductEditForm({ ...productEditForm, title_original: e.target.value })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-text-secondary-light">商品描述 (中文)</label>
                <div className="flex flex-col gap-2">
                  <textarea value={productEditForm.desc_zh} onChange={(e) => setProductEditForm({ ...productEditForm, desc_zh: e.target.value })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm min-h-20" />
                  <button 
                    onClick={() => handleTranslate("description")} 
                    disabled={isTranslating || !productEditForm.desc_original}
                    className="self-end px-3 py-1 rounded-lg border border-primary text-primary text-xs hover:bg-primary/10 disabled:opacity-50"
                  >
                    從原文翻譯
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm text-text-secondary-light">商品描述 (原文)</label>
                <textarea value={productEditForm.desc_original} onChange={(e) => setProductEditForm({ ...productEditForm, desc_original: e.target.value })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm min-h-20" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-text-primary-light">價格設定 (台幣整數)</label>
                  <button
                    type="button"
                    onClick={recalculateEditPrices}
                    className="px-3 py-1 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                  >
                    重新計算 (+25%/+35%)
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm text-text-secondary-light">成本 (TWD)</label>
                    <input type="number" step={1} min={0} value={productEditForm.cost_twd} onChange={(e) => setProductEditForm({ ...productEditForm, cost_twd: Math.max(0, Math.floor(Number(e.target.value || 0))) })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-sm text-text-secondary-light">批發價 (+25%)</label>
                    <input type="number" step={1} min={0} value={productEditForm.wholesale_price_twd} onChange={(e) => setProductEditForm({ ...productEditForm, wholesale_price_twd: Math.max(0, Math.floor(Number(e.target.value || 0))) })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-sm text-text-secondary-light">零售價 (+35%)</label>
                    <input type="number" step={1} min={0} value={productEditForm.retail_price_twd} onChange={(e) => setProductEditForm({ ...productEditForm, retail_price_twd: Math.max(0, Math.floor(Number(e.target.value || 0))) })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="mt-1 text-xs text-text-secondary-light">
                  預設：批發價 = 成本 × 1.25，零售價 = 成本 × 1.35，可手動調整
                </div>
              </div>

              {/* 規格與變體管理 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-text-primary-light">規格設定 (顏色/尺寸等)</label>
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
                      (重)生成變體列表
                    </button>
                  </div>
                )}
                {variants.length > 0 && (
                  <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                    <div className="flex text-xs font-bold text-text-secondary-light px-2 mb-1">
                      <div className="w-1/3">規格組合</div>
                      <div className="w-20 px-2">價格</div>
                      <div className="w-16 px-2">庫存</div>
                      <div className="flex-1 px-2">SKU</div>
                    </div>
                    {variants.map((v, vIdx) => (
                      <div key={v.id || vIdx} className="flex items-center gap-2 p-2 border border-border-light rounded bg-white text-sm">
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

              {/* 圖片管理 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-text-primary-light">商品圖片管理</label>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1 rounded-lg border-2 border-dashed border-border-light hover:bg-background-light transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={async (e) => {
                        if (!e.target.files?.length) return;
                        setIsUploading(true);
                        try {
                          for (let i = 0; i < e.target.files.length; i++) {
                            const file = e.target.files[i];
                            const formData = new FormData();
                            formData.append("file", file);

                            const { data: sessionData } = await supabase.auth.getSession();
                            const token = sessionData.session?.access_token;

                            const res = await fetch("/api/upload", {
                              method: "POST",
                              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                              body: formData
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
                              console.error("Upload failed:", (data as { error?: string })?.error || rawText || res.status);
                              continue;
                            }

                            if (data && (data as { url?: string }).url) {
                              setProductEditForm(prev => ({
                                ...prev,
                                images: [
                                  ...prev.images,
                                  {
                                    url: (data as { url: string }).url,
                                    sort: prev.images.length,
                                    is_product: true,
                                    is_description: false,
                                  },
                                ],
                              }));
                            } else {
                              console.error("Upload failed:", (data as { error?: string })?.error || "Unknown error");
                            }
                          }
                        } catch (err) {
                          alert("上傳失敗");
                        } finally {
                          setIsUploading(false);
                        }
                      }}
                      disabled={isUploading}
                    />
                    <span className="material-symbols-outlined text-text-secondary-light text-sm">add_photo_alternate</span>
                    <span className="text-xs text-text-secondary-light">{isUploading ? "上傳中..." : "新增圖片"}</span>
                  </label>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {productEditForm.images.map((img, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 border border-border-light rounded-lg bg-background-light">
                      <img src={ensureHttps(img.url)} alt="" className="w-16 h-16 object-cover border border-border-light rounded-md shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={img.is_product}
                              onChange={(e) => {
                                const newImages = [...productEditForm.images];
                                newImages[idx] = { ...newImages[idx], is_product: e.target.checked };
                                setProductEditForm({ ...productEditForm, images: newImages });
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-text-primary-light">商品圖</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={img.is_description}
                              onChange={(e) => {
                                const newImages = [...productEditForm.images];
                                newImages[idx] = { ...newImages[idx], is_description: e.target.checked };
                                setProductEditForm({ ...productEditForm, images: newImages });
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-text-primary-light">描述圖</span>
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-secondary-light">排序: {img.sort}</span>
                          <div className="flex gap-1">
                            <button
                              className="p-1 hover:bg-gray-100 rounded text-text-secondary-light"
                              onClick={() => {
                                if (idx > 0) {
                                  const newImages = [...productEditForm.images];
                                  [newImages[idx - 1], newImages[idx]] = [newImages[idx], newImages[idx - 1]];
                                  // Update sort values
                                  newImages.forEach((img, i) => img.sort = i);
                                  setProductEditForm({ ...productEditForm, images: newImages });
                                }
                              }}
                              disabled={idx === 0}
                            >
                              <span className="material-symbols-outlined text-sm">arrow_upward</span>
                            </button>
                            <button
                              className="p-1 hover:bg-gray-100 rounded text-text-secondary-light"
                              onClick={() => {
                                if (idx < productEditForm.images.length - 1) {
                                  const newImages = [...productEditForm.images];
                                  [newImages[idx], newImages[idx + 1]] = [newImages[idx + 1], newImages[idx]];
                                  // Update sort values
                                  newImages.forEach((img, i) => img.sort = i);
                                  setProductEditForm({ ...productEditForm, images: newImages });
                                }
                              }}
                              disabled={idx === productEditForm.images.length - 1}
                            >
                              <span className="material-symbols-outlined text-sm">arrow_downward</span>
                            </button>
                            <button
                              className="p-1 hover:bg-red-100 rounded text-red-500"
                              onClick={() => {
                                const newImages = productEditForm.images.filter((_, i) => i !== idx);
                                // Update sort values
                                newImages.forEach((img, i) => img.sort = i);
                                setProductEditForm({ ...productEditForm, images: newImages });
                              }}
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {productEditForm.images.length === 0 && (
                    <div className="text-sm text-text-secondary-light text-center py-4">此商品無圖片</div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm text-text-secondary-light">狀態</label>
                <select value={productEditForm.status} onChange={(e) => setProductEditForm({ ...productEditForm, status: e.target.value as "draft" | "published" })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm">
                  <option value="published">上架</option>
                  <option value="draft">草稿</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowProductEdit(false)} className="px-4 py-2 rounded-lg border border-border-light text-sm">取消</button>
              <button onClick={saveEditProduct} className="px-4 py-2 rounded-lg bg-primary text-white text-sm">保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 分頁 */}
      {productTotal > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary-light">
            共 {productTotal} 件商品，第 {productPage + 1} 頁
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchProducts(productPage - 1, selectedProductL1)}
              disabled={productPage === 0}
              className="px-3 py-1 rounded-lg border border-border-light text-sm hover:bg-background-light disabled:opacity-50"
            >
              上一頁
            </button>
            <button
              onClick={() => fetchProducts(productPage + 1, selectedProductL1)}
              disabled={(productPage + 1) * pageSize >= productTotal}
              className="px-3 py-1 rounded-lg border border-border-light text-sm hover:bg-background-light disabled:opacity-50"
            >
              下一頁
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
