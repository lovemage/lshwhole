import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function LimitedTimeProductManager() {
  interface LimitedProduct {
    id: number;
    title: string;
    retail_price_twd: number | null;
    wholesale_price_twd: number | null;
    cover_image_url: string | null;
    limited_time_end?: string | null;
  }

  interface Category {
    id: number;
    name: string;
    level: number;
    sort: number;
  }

  const [products, setProducts] = useState<LimitedProduct[]>([]);
  const [candidates, setCandidates] = useState<LimitedProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [candidateTotal, setCandidateTotal] = useState(0);
  const [candidatePage, setCandidatePage] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<number[]>([]);
  const [adding, setAdding] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  
  // Date picker state
  const [endTime, setEndTime] = useState("");

  // Categories for filter
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

  // Manual Add State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    sku: "",
    title: "",
    description: "",
    cost_twd: 0,
    wholesale_price_twd: 0,
    retail_price_twd: 0,
    image_urls: [] as string[],
    end_time: ""
  });
  const [isUploading, setIsUploading] = useState(false);
  const [manualPublishing, setManualPublishing] = useState(false);

  const pageSize = 20;

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

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

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/limited-time-products");
      if (res.ok) {
        const j = await res.json();
        setProducts(j.products || []);
      }
    } catch (err) {
      console.error("Failed to fetch limited time products:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidates = async (page: number = 0) => {
    try {
      const offset = page * pageSize;
      let url = `/api/products?limit=${pageSize}&offset=${offset}&status=published`;
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      if (selectedCategoryId) {
        url += `&category_id=${selectedCategoryId}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const result = await res.json();
        // Filter out already added products
        const currentIds = new Set(products.map((p) => p.id));
        const newCandidates = (result.data || []).map((p: LimitedProduct & { is_already_added?: boolean }) => ({
          ...p,
          is_already_added: currentIds.has(p.id)
        }));
        setCandidates(newCandidates);
        setCandidateTotal(result.count || 0);
        setCandidatePage(page);
      }
    } catch (err) {
      console.error("Failed to fetch candidates:", err);
    }
  };

  const handleAddProducts = async () => {
    if (selectedCandidateIds.length === 0) return alert("請選擇商品");
    if (!endTime) return alert("請設定結束時間");

    try {
      setAdding(true);
      const res = await fetch("/api/admin/limited-time-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          product_ids: selectedCandidateIds,
          end_time: new Date(endTime).toISOString()
        }),
      });

      if (res.ok) {
        alert("已加入限時商品");
        setSelectedCandidateIds([]);
        setEndTime("");
        setShowAddModal(false);
        fetchProducts();
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || "加入失敗");
      }
    } catch (err) {
      console.error("Failed to add products:", err);
      alert("加入失敗");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveProducts = async () => {
    if (selectedProductIds.length === 0) return alert("請選擇要移除的商品");
    if (!confirm(`確定要移除選取的 ${selectedProductIds.length} 件商品嗎？`)) return;

    try {
      const res = await fetch("/api/admin/limited-time-products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_ids: selectedProductIds }),
      });

      if (res.ok) {
        alert("已移除限時商品");
        setSelectedProductIds([]);
        fetchProducts();
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || "移除失敗");
      }
    } catch (err) {
      console.error("Failed to remove products:", err);
      alert("移除失敗");
    }
  };

  const toggleCandidate = (id: number) => {
    setSelectedCandidateIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleProductSelect = (id: number) => {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Helper to format remaining time
  const getRemainingTime = (end: string) => {
    const diff = new Date(end).getTime() - new Date().getTime();
    if (diff <= 0) return <span className="text-red-500 font-bold">已結束</span>;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${days}天 ${hours}時 ${minutes}分`;
  };

  return (
    <div className="py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-text-primary-light">限時商品管理</h2>
          <p className="text-sm text-text-secondary-light mt-1">設定首頁與限時專區顯示的商品，並設定結束時間</p>
        </div>
        <div className="flex gap-3">
          {selectedProductIds.length > 0 && (
            <button
              onClick={handleRemoveProducts}
              className="px-4 py-2 rounded-lg border border-danger text-danger text-sm font-medium hover:bg-danger/10"
            >
              移除選取 ({selectedProductIds.length})
            </button>
          )}
          <button
            onClick={() => {
              setShowAddModal(true);
              fetchCandidates(0);
              setSelectedCandidateIds([]);
              setEndTime("");
            }}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90"
          >
            從商品庫發布商品
          </button>
          <button
            onClick={() => setShowManualModal(true)}
            className="px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-700"
          >
            手動新增商品
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-text-secondary-light">載入中...</p>
      ) : products.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-border-light rounded-xl">
          <p className="text-text-secondary-light mb-4">尚未設定限時商品</p>
          <button
            onClick={() => {
              setShowAddModal(true);
              fetchCandidates(0);
            }}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium"
          >
            立即新增
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-border-light bg-card-light overflow-hidden">
          <table className="w-full">
            <thead className="bg-background-light border-b border-border-light">
              <tr>
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={selectedProductIds.length === products.length && products.length > 0}
                    onChange={() => {
                      if (selectedProductIds.length === products.length) setSelectedProductIds([]);
                      else setSelectedProductIds(products.map(p => p.id));
                    }}
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">SKU</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">商品名稱</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">價格</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">結束時間</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">剩餘時間</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-border-light hover:bg-background-light">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedProductIds.includes(p.id)}
                      onChange={() => toggleProductSelect(p.id)}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm">{p.sku}</td>
                  <td className="px-4 py-3 text-sm">{p.title_zh || p.title_original}</td>
                  <td className="px-4 py-3 text-sm">NT${Number(p.retail_price_twd).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary-light">
                    {p.limited_time_end ? new Date(p.limited_time_end).toLocaleString("zh-TW") : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary-light">
                    {p.limited_time_end ? getRemainingTime(p.limited_time_end) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 新增限時商品 Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-3xl rounded-xl border border-border-light bg-card-light p-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text-primary-light">選擇商品加入限時活動</h3>
              <button onClick={() => setShowAddModal(false)} className="text-text-secondary-light">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-border-light">
                <label className="block text-sm font-bold text-text-primary-light mb-2">
                    設定結束時間 (UTC+8)
                </label>
                <input 
                    type="datetime-local" 
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full p-2 border border-border-light rounded-lg"
                />
            </div>

            <div className="flex gap-3 mb-4">
              <select
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value);
                  setCandidatePage(0);
                }}
                className="rounded-lg border border-border-light px-3 py-2 text-sm min-w-[150px]"
              >
                <option value="">所有分類</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.level === 1 ? "L1" : c.level === 2 ? "L2" : "L3"})
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="搜尋商品..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCandidatePage(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") fetchCandidates(0);
                }}
                className="flex-1 rounded-lg border border-border-light px-3 py-2 text-sm"
              />
              <button
                onClick={() => fetchCandidates(0)}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium"
              >
                搜尋
              </button>
            </div>

            <div className="flex-1 overflow-y-auto border border-border-light rounded-lg">
              <table className="w-full">
                <thead className="bg-background-light sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left w-10">
                      <input
                        type="checkbox"
                        checked={candidates.length > 0 && candidates.every(p => p.is_already_added || selectedCandidateIds.includes(p.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const newIds = candidates.filter(p => !p.is_already_added).map(p => p.id);
                            setSelectedCandidateIds(prev => Array.from(new Set([...prev, ...newIds])));
                          } else {
                            const removeIds = candidates.map(p => p.id);
                            setSelectedCandidateIds(prev => prev.filter(id => !removeIds.includes(id)));
                          }
                        }}
                      />
                    </th>
                    <th className="px-4 py-2 text-left text-sm">SKU</th>
                    <th className="px-4 py-2 text-left text-sm">名稱</th>
                    <th className="px-4 py-2 text-left text-sm">狀態</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.length === 0 ? (
                    <tr><td colSpan={4} className="p-4 text-center text-text-secondary-light">查無商品</td></tr>
                  ) : (
                    candidates.map(p => (
                      <tr key={p.id} className={`border-b border-border-light ${p.is_already_added ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}`}>
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={p.is_already_added || selectedCandidateIds.includes(p.id)}
                            disabled={p.is_already_added}
                            onChange={() => toggleCandidate(p.id)}
                          />
                        </td>
                        <td className="px-4 py-2 text-sm">{p.sku}</td>
                        <td className="px-4 py-2 text-sm line-clamp-1">{p.title_zh || p.title_original}</td>
                        <td className="px-4 py-2 text-sm">
                          {p.is_already_added ? (
                            <span className="text-primary text-xs font-bold border border-primary px-2 py-0.5 rounded">已加入</span>
                          ) : (
                            <span className="text-text-secondary-light text-xs">可加入</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for candidates */}
            {candidateTotal > pageSize && (
              <div className="flex justify-center gap-2 mt-4">
                <button
                  onClick={() => fetchCandidates(candidatePage - 1)}
                  disabled={candidatePage === 0}
                  className="px-3 py-1 rounded border border-border-light text-sm disabled:opacity-50"
                >
                  上一頁
                </button>
                <span className="text-sm py-1">
                  {candidatePage + 1} / {Math.ceil(candidateTotal / pageSize)}
                </span>
                <button
                  onClick={() => fetchCandidates(candidatePage + 1)}
                  disabled={(candidatePage + 1) * pageSize >= candidateTotal}
                  className="px-3 py-1 rounded border border-border-light text-sm disabled:opacity-50"
                >
                  下一頁
                </button>
              </div>
            )}

            <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-border-light">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-lg border border-border-light text-sm">取消</button>
              <button
                onClick={handleAddProducts}
                disabled={adding || selectedCandidateIds.length === 0 || !endTime}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-50"
              >
                {adding ? "加入中..." : `加入選取 (${selectedCandidateIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 手動新增商品 Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-xl border border-border-light bg-card-light p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text-primary-light">手動新增限時商品</h3>
              <button onClick={() => setShowManualModal(false)} className="text-text-secondary-light">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              {/* 圖片上傳 */}
              <div>
                <label className="block text-sm font-medium text-text-primary-light mb-2">商品圖片</label>
                <div className="flex flex-wrap gap-3">
                  {manualForm.image_urls.map((url, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded border border-border-light overflow-hidden group">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setManualForm(prev => ({ ...prev, image_urls: prev.image_urls.filter((_, i) => i !== idx) }))}
                        className="absolute top-0 right-0 bg-black/50 text-white p-0.5 opacity-0 group-hover:opacity-100"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  ))}
                  <label className="flex flex-col items-center justify-center w-20 h-20 rounded border-2 border-dashed border-border-light cursor-pointer hover:bg-background-light">
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
                              setManualForm(prev => ({ ...prev, image_urls: [...prev.image_urls, data.url!] }));
                            } else {
                              console.error("Upload failed:", (data as { error?: string })?.error || "Unknown error");
                            }
                          }
                        } catch {
                          alert("上傳失敗");
                        } finally {
                          setIsUploading(false);
                        }
                      }}
                      disabled={isUploading}
                    />
                    <span className="material-symbols-outlined text-text-secondary-light">add</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary-light mb-1">SKU</label>
                  <input
                    value={manualForm.sku}
                    onChange={(e) => setManualForm({ ...manualForm, sku: e.target.value })}
                    className="w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary-light mb-1">結束時間 (UTC+8)</label>
                  <input
                    type="datetime-local"
                    value={manualForm.end_time}
                    onChange={(e) => setManualForm({ ...manualForm, end_time: e.target.value })}
                    className="w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary-light mb-1">商品標題</label>
                <input
                  value={manualForm.title}
                  onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                  className="w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary-light mb-1">商品描述</label>
                <textarea
                  value={manualForm.description}
                  onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-border-light px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 bg-gray-50 p-3 rounded-lg">
                <div>
                  <label className="block text-xs font-medium text-text-secondary-light mb-1">成本價</label>
                  <input
                    type="number"
                    value={manualForm.cost_twd}
                    onChange={(e) => {
                      const cost = Math.max(0, Number(e.target.value));
                      setManualForm({
                        ...manualForm,
                        cost_twd: cost,
                        wholesale_price_twd: Math.floor(cost * 1.25),
                        retail_price_twd: Math.floor(cost * 1.35)
                      });
                    }}
                    className="w-full rounded border border-border-light px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary-light mb-1">批發價 (+25%)</label>
                  <input
                    type="number"
                    value={manualForm.wholesale_price_twd}
                    onChange={(e) => setManualForm({ ...manualForm, wholesale_price_twd: Math.max(0, Number(e.target.value)) })}
                    className="w-full rounded border border-border-light px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary-light mb-1">零售價 (+35%)</label>
                  <input
                    type="number"
                    value={manualForm.retail_price_twd}
                    onChange={(e) => setManualForm({ ...manualForm, retail_price_twd: Math.max(0, Number(e.target.value)) })}
                    className="w-full rounded border border-border-light px-2 py-1 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowManualModal(false)} className="px-4 py-2 rounded-lg border border-border-light text-sm">取消</button>
              <button
                onClick={async () => {
                  if (!manualForm.sku || !manualForm.title || !manualForm.end_time) {
                    return alert("請填寫完整資訊");
                  }
                  setManualPublishing(true);
                  try {
                    // 1. 上架商品
                    const resPub = await fetch("/api/publish-product", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        sku: manualForm.sku,
                        title: manualForm.title,
                        description: manualForm.description,
                        cost_twd: manualForm.cost_twd,
                        wholesale_price_twd: manualForm.wholesale_price_twd,
                        retail_price_twd: manualForm.retail_price_twd,
                        image_urls: manualForm.image_urls,
                        status: "published"
                      }),
                    });
                    
                    if (!resPub.ok) throw new Error("上架失敗");
                    const { id: productId } = await resPub.json();

                    // 2. 加入限時商品
                    const resLimit = await fetch("/api/admin/limited-time-products", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ 
                        product_ids: [productId],
                        end_time: new Date(manualForm.end_time).toISOString()
                      }),
                    });

                    if (!resLimit.ok) throw new Error("設定限時失敗");

                    alert("新增成功");
                    setShowManualModal(false);
                    setManualForm({
                      sku: "",
                      title: "",
                      description: "",
                      cost_twd: 0,
                      wholesale_price_twd: 0,
                      retail_price_twd: 0,
                      image_urls: [],
                      end_time: ""
                    });
                    fetchProducts();
                  } catch (err) {
                    console.error(err);
                    alert("操作失敗");
                  } finally {
                    setManualPublishing(false);
                  }
                }}
                disabled={manualPublishing || isUploading}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-50"
              >
                {manualPublishing ? "處理中..." : "確認新增"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
