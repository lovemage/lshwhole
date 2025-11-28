import { useState, useEffect } from "react";

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
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedProductL1, setSelectedProductL1] = useState<number | null>(null);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productPage, setProductPage] = useState(0);
  const [productTotal, setProductTotal] = useState(0);
  const pageSize = 20;
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [showProductEdit, setShowProductEdit] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
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
    images: [] as any[],
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchProducts(0, null);
  }, []);

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
      setSelectedProductIds(products.map((p: any) => p.id));
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
    setShowProductEdit(true);
  };

  const openEditProduct = async (p: any) => {
    setEditingProduct(p);

    // Fetch product images
    let images = [];
    try {
      const res = await fetch(`/api/products/${p.id}`);
      if (res.ok) {
        const productData = await res.json();
        // Convert string URLs to image objects
        images = (productData.images || []).map((url: string, idx: number) => ({
          url,
          sort: idx,
          is_product: true,
          is_description: false
        }));
      }
    } catch (err) {
      console.error("Failed to fetch product images:", err);
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

  const saveEditProduct = async () => {
    // 價格強制為整數
    const toInt = (v: any) => (v === null || v === undefined || v === "" ? null : Math.floor(Number(v)));
    
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
              <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">商品代碼</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">商品名稱</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">零售價</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">批發價</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">成本</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">狀態</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">操作</th>
            </tr>
          </thead>
          <tbody>
            {productsLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-text-secondary-light">
                  載入中...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-text-secondary-light">
                  暫無商品
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-b border-border-light hover:bg-background-light">
                  <td className="px-4 py-3 text-sm"><input type="checkbox" checked={selectedProductIds.includes(product.id)} onChange={() => toggleSelectOne(product.id)} /></td>
                  <td className="px-4 py-3 text-sm text-text-primary-light">{product.sku}</td>
                  <td className="px-4 py-3 text-sm text-text-primary-light line-clamp-2">{product.title_zh || product.title_original || '-'}</td>
                  <td className="px-4 py-3 text-sm text-text-primary-light">NT${Number(product.retail_price_twd || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-text-primary-light">NT${Number(product.wholesale_price_twd || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-text-primary-light">NT${Number(product.cost_twd || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.status === 'published'
                      ? "bg-success/20 text-success"
                      : "bg-danger/20 text-danger"
                      }`}>
                      {product.status === 'published' ? "上架" : "草稿"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm flex gap-3">
                    <button className="text-primary hover:underline" onClick={() => openEditProduct(product)}>編輯</button>
                    <button className="text-danger hover:underline" onClick={() => deleteProduct(product.id)}>刪除</button>
                  </td>
                </tr>
              ))
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
                            const res = await fetch("/api/upload", { method: "POST", body: formData });
                            if (res.ok) {
                              const data = await res.json();
                              setProductEditForm(prev => ({
                                ...prev,
                                images: [...prev.images, { url: data.url, sort: prev.images.length, is_product: true, is_description: false }]
                              }));
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
                <select value={productEditForm.status} onChange={(e) => setProductEditForm({ ...productEditForm, status: e.target.value as any })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm">
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
