import { useState, useEffect } from "react";

export default function LimitedTimeProductManager() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [candidateTotal, setCandidateTotal] = useState(0);
  const [candidatePage, setCandidatePage] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<number[]>([]);
  const [adding, setAdding] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  
  // Date picker state
  const [endTime, setEndTime] = useState("");

  const pageSize = 20;

  useEffect(() => {
    fetchProducts();
  }, []);

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
      const res = await fetch(url);
      if (res.ok) {
        const result = await res.json();
        // Filter out already added products
        const currentIds = new Set(products.map((p) => p.id));
        const newCandidates = (result.data || []).map((p: any) => ({
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
            新增限時商品
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
    </div>
  );
}
