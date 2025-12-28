import { useState, useEffect } from "react";

export default function HotProductManager() {
  const [hotProducts, setHotProducts] = useState<any[]>([]);
  const [hotProductsLoading, setHotProductsLoading] = useState(false);
  const [showAddHotProduct, setShowAddHotProduct] = useState(false);
  const [hotProductCandidates, setHotProductCandidates] = useState<any[]>([]);
  const [hotProductCandidateTotal, setHotProductCandidateTotal] = useState(0);
  const [hotProductCandidatePage, setHotProductCandidatePage] = useState(0);
  const [hotProductSearch, setHotProductSearch] = useState("");
  const [selectedHotCandidateIds, setSelectedHotCandidateIds] = useState<number[]>([]);
  const [addingHotProducts, setAddingHotProducts] = useState(false);
  const [selectedHotProductIds, setSelectedHotProductIds] = useState<number[]>([]);
  const pageSize = 20;

  // 展示設定狀態
  const [displaySettings, setDisplaySettings] = useState<{
    popular: number[];
    korea: number[];
    japan: number[];
    thailand: number[];
  }>({ popular: [], korea: [], japan: [], thailand: [] });
  const [showDisplaySettingsDrawer, setShowDisplaySettingsDrawer] = useState(false);
  const [activeDisplayTab, setActiveDisplayTab] = useState<"popular" | "korea" | "japan" | "thailand">("popular");
  const [displayCandidates, setDisplayCandidates] = useState<any[]>([]);
  const [displayCandidateSearch, setDisplayCandidateSearch] = useState("");
  const [displayCandidatePage, setDisplayCandidatePage] = useState(0);
  const [displayCandidateTotal, setDisplayCandidateTotal] = useState(0);
  const [selectedDisplayCandidateIds, setSelectedDisplayCandidateIds] = useState<number[]>([]);
  const [savingDisplaySettings, setSavingDisplaySettings] = useState(false);
  const [displaySettingsLoading, setDisplaySettingsLoading] = useState(false);
  
  // 用於顯示已選取商品的詳細資訊 (包含非上架商品)
  const [currentSelectedProducts, setCurrentSelectedProducts] = useState<any[]>([]);
  const [loadingSelectedProducts, setLoadingSelectedProducts] = useState(false);

  useEffect(() => {
    fetchHotProducts();
    fetchDisplaySettings();
  }, []);

  // 當開啟 Drawer 時，讀取目前選取的商品詳情
  useEffect(() => {
    if (showDisplaySettingsDrawer) {
      fetchCurrentSelectedProducts();
    }
  }, [showDisplaySettingsDrawer, displaySettings]);

  const fetchHotProducts = async () => {
    try {
      setHotProductsLoading(true);
      const res = await fetch("/api/admin/hot-products", {
        headers: { Authorization: `Bearer ${localStorage.getItem("supabase.auth.token")}` }
      });
      // Retry without header if first attempt fails or just rely on cookie
      const res2 = await fetch("/api/admin/hot-products");

      if (res2.ok) {
        const j = await res2.json();
        setHotProducts(j.products || []);
      } else {
        console.error("Failed to fetch hot products");
      }
    } catch (err) {
      console.error("Failed to fetch hot products:", err);
    } finally {
      setHotProductsLoading(false);
    }
  };

  const fetchHotProductCandidates = async (page: number = 0) => {
    try {
      const offset = page * pageSize;
      let url = `/api/products?limit=${pageSize}&offset=${offset}&status=published`; // 僅限已上架商品
      if (hotProductSearch) {
        url += `&search=${encodeURIComponent(hotProductSearch)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const result = await res.json();
        // 過濾掉已經是熱銷商品的
        const currentHotIds = new Set(hotProducts.map((p) => p.id));
        const candidates = (result.data || []).map((p: any) => ({
          ...p,
          is_already_hot: currentHotIds.has(p.id)
        }));
        setHotProductCandidates(candidates);
        setHotProductCandidateTotal(result.count || 0);
        setHotProductCandidatePage(page);
      }
    } catch (err) {
      console.error("Failed to fetch candidates:", err);
    }
  };

  const handleAddHotProducts = async () => {
    if (selectedHotCandidateIds.length === 0) return alert("請選擇商品");

    try {
      setAddingHotProducts(true);
      const res = await fetch("/api/admin/hot-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_ids: selectedHotCandidateIds }),
      });

      if (res.ok) {
        alert("已加入熱銷商品");
        setSelectedHotCandidateIds([]);
        setShowAddHotProduct(false);
        fetchHotProducts();
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || "加入失敗");
      }
    } catch (err) {
      console.error("Failed to add hot products:", err);
      alert("加入失敗");
    } finally {
      setAddingHotProducts(false);
    }
  };

  const handleRemoveHotProducts = async () => {
    if (selectedHotProductIds.length === 0) return alert("請選擇要移除的商品");
    if (!confirm(`確定要移除選取的 ${selectedHotProductIds.length} 件商品嗎？`)) return;

    try {
      const res = await fetch("/api/admin/hot-products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_ids: selectedHotProductIds }),
      });

      if (res.ok) {
        alert("已移除熱銷商品");
        setSelectedHotProductIds([]);
        fetchHotProducts();
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || "移除失敗");
      }
    } catch (err) {
      console.error("Failed to remove hot products:", err);
      alert("移除失敗");
    }
  };

  const fetchDisplaySettings = async () => {
    try {
      setDisplaySettingsLoading(true);
      const res = await fetch("/api/display-settings");
      if (res.ok) {
        const data = await res.json();
        setDisplaySettings(data);
      }
    } catch (err) {
      console.error("Failed to fetch display settings:", err);
    } finally {
      setDisplaySettingsLoading(false);
    }
  };

  // 取得目前設定的所有商品的詳細資訊 (包含可能已下架的)
  const fetchCurrentSelectedProducts = async () => {
    const currentIds = displaySettings[activeDisplayTab] || [];
    if (currentIds.length === 0) {
      setCurrentSelectedProducts([]);
      return;
    }

    try {
      setLoadingSelectedProducts(true);
      // 使用 IDs 查詢，API 會忽略 status 過濾
      const res = await fetch(`/api/products?ids=${currentIds.join(',')}&limit=${currentIds.length}`);
      if (res.ok) {
        const j = await res.json();
        const foundProducts = j.data || [];
        
        // 找出查不到的 ID (物理刪除)
        const foundIds = new Set(foundProducts.map((p: any) => p.id));
        const missingIds = currentIds.filter(id => !foundIds.has(id));
        
        // 為缺失的 ID 建立假資料以便顯示和移除
        const missingProducts = missingIds.map(id => ({
          id,
          sku: 'UNKNOWN',
          title_zh: `(商品不存在或已刪除 ID: ${id})`,
          status: 'deleted',
          retail_price_twd: 0,
          is_missing: true
        }));

        // 合併並排序 (依照設定順序)
        const allProducts = [...foundProducts, ...missingProducts].sort((a, b) => {
          return currentIds.indexOf(a.id) - currentIds.indexOf(b.id);
        });

        setCurrentSelectedProducts(allProducts);
      }
    } catch (err) {
      console.error("Failed to fetch selected products:", err);
    } finally {
      setLoadingSelectedProducts(false);
    }
  };

  const fetchDisplayCandidates = async (page: number = 0) => {
    try {
      const offset = page * pageSize;
      let url = `/api/products?limit=${pageSize}&offset=${offset}&status=published`;
      if (displayCandidateSearch) {
        url += `&search=${encodeURIComponent(displayCandidateSearch)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const j = await res.json();
        const currentIds = displaySettings[activeDisplayTab] || [];
        const candidates = (j.data || []).map((p: any) => ({
          ...p,
          is_already_added: currentIds.includes(p.id)
        }));
        setDisplayCandidates(candidates);
        setDisplayCandidateTotal(j.count || 0);
        setDisplayCandidatePage(page);
      }
    } catch (err) {
      console.error("Failed to fetch display candidates:", err);
    }
  };

  const saveDisplaySettings = async (newSettings: any) => {
    try {
      setSavingDisplaySettings(true);
      const res = await fetch("/api/display-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });
      if (res.ok) {
        setDisplaySettings(newSettings);
        alert("設定已儲存");
        setShowDisplaySettingsDrawer(false);
      } else {
        alert("儲存失敗");
      }
    } catch (err) {
      console.error("Failed to save display settings:", err);
      alert("儲存失敗");
    } finally {
      setSavingDisplaySettings(false);
    }
  };

  const handleAddDisplayProducts = async () => {
    if (selectedDisplayCandidateIds.length === 0) return;

    const currentIds = displaySettings[activeDisplayTab] || [];
    const newIds = [...currentIds, ...selectedDisplayCandidateIds.filter(id => !currentIds.includes(id))];

    const newSettings = {
      ...displaySettings,
      [activeDisplayTab]: newIds
    };

    await saveDisplaySettings(newSettings);
    setSelectedDisplayCandidateIds([]);
    fetchCurrentSelectedProducts(); // 更新已選列表
  };

  const handleRemoveDisplayProducts = async (idsToRemove: number[]) => {
    if (!confirm(`確定要移除選取的 ${idsToRemove.length} 個商品嗎？`)) return;

    const currentIds = displaySettings[activeDisplayTab] || [];
    const newIds = currentIds.filter(id => !idsToRemove.includes(id));

    const newSettings = {
      ...displaySettings,
      [activeDisplayTab]: newIds
    };

    await saveDisplaySettings(newSettings);
    fetchCurrentSelectedProducts(); // 更新已選列表
  };

  const handleRemoveInvalidDisplayProducts = async () => {
    const invalidIds = currentSelectedProducts.filter(p => p.is_missing).map(p => p.id);
    if (invalidIds.length === 0) return;
    
    if (!confirm(`確定要移除所有 ${invalidIds.length} 個失效商品嗎？`)) return;
    await handleRemoveDisplayProducts(invalidIds);
  };

  const toggleHotCandidate = (id: number) => {
    setSelectedHotCandidateIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleHotProductSelect = (id: number) => {
    setSelectedHotProductIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-text-secondary-light mt-1">設定首頁與熱銷專區顯示的商品，可調整排序</p>
        </div>
        <div className="flex gap-3">
          {selectedHotProductIds.length > 0 && (
            <button
              onClick={handleRemoveHotProducts}
              className="px-4 py-2 rounded-lg border border-danger text-danger text-sm font-medium hover:bg-danger/10"
            >
              移除選取 ({selectedHotProductIds.length})
            </button>
          )}
          <button
            onClick={() => {
              setShowAddHotProduct(true);
              fetchHotProductCandidates(0);
              setSelectedHotCandidateIds([]);
            }}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90"
          >
            新增熱銷商品
          </button>
        </div>
      </div>

      {hotProductsLoading ? (
        <p className="text-text-secondary-light">載入中...</p>
      ) : hotProducts.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-border-light rounded-xl">
          <p className="text-text-secondary-light mb-4">尚未設定熱銷商品</p>
          <button
            onClick={() => {
              setShowAddHotProduct(true);
              fetchHotProductCandidates(0);
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
                    checked={selectedHotProductIds.length === hotProducts.length && hotProducts.length > 0}
                    onChange={() => {
                      if (selectedHotProductIds.length === hotProducts.length) setSelectedHotProductIds([]);
                      else setSelectedHotProductIds(hotProducts.map(p => p.id));
                    }}
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">排序</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">SKU</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">商品名稱</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">價格</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">標記時間</th>
              </tr>
            </thead>
            <tbody>
              {hotProducts.map((p, idx) => (
                <tr key={p.id} className="border-b border-border-light hover:bg-background-light">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedHotProductIds.includes(p.id)}
                      onChange={() => toggleHotProductSelect(p.id)}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">{idx + 1}</td>
                  <td className="px-4 py-3 text-sm">{p.sku}</td>
                  <td className="px-4 py-3 text-sm">{p.title_zh || p.title_original}</td>
                  <td className="px-4 py-3 text-sm">NT${Number(p.retail_price_twd).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary-light">
                    {p.hot_marked_at ? new Date(p.hot_marked_at).toLocaleDateString("zh-TW") : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 新增熱銷商品 Modal */}
      {showAddHotProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-3xl rounded-xl border border-border-light bg-card-light p-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text-primary-light">選擇商品加入熱銷</h3>
              <button onClick={() => setShowAddHotProduct(false)} className="text-text-secondary-light">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex gap-3 mb-4">
              <input
                type="text"
                placeholder="搜尋商品..."
                value={hotProductSearch}
                onChange={(e) => {
                  setHotProductSearch(e.target.value);
                  setHotProductCandidatePage(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") fetchHotProductCandidates(0);
                }}
                className="flex-1 rounded-lg border border-border-light px-3 py-2 text-sm"
              />
              <button
                onClick={() => fetchHotProductCandidates(0)}
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
                        checked={hotProductCandidates.length > 0 && hotProductCandidates.every(p => p.is_already_hot || selectedHotCandidateIds.includes(p.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const newIds = hotProductCandidates.filter(p => !p.is_already_hot).map(p => p.id);
                            setSelectedHotCandidateIds(prev => Array.from(new Set([...prev, ...newIds])));
                          } else {
                            const removeIds = hotProductCandidates.map(p => p.id);
                            setSelectedHotCandidateIds(prev => prev.filter(id => !removeIds.includes(id)));
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
                  {hotProductCandidates.length === 0 ? (
                    <tr><td colSpan={4} className="p-4 text-center text-text-secondary-light">查無商品</td></tr>
                  ) : (
                    hotProductCandidates.map(p => (
                      <tr key={p.id} className={`border-b border-border-light ${p.is_already_hot ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}`}>
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={p.is_already_hot || selectedHotCandidateIds.includes(p.id)}
                            disabled={p.is_already_hot}
                            onChange={() => toggleHotCandidate(p.id)}
                          />
                        </td>
                        <td className="px-4 py-2 text-sm">{p.sku}</td>
                        <td className="px-4 py-2 text-sm line-clamp-1">{p.title_zh || p.title_original}</td>
                        <td className="px-4 py-2 text-sm">
                          {p.is_already_hot ? (
                            <span className="text-success text-xs font-bold border border-success px-2 py-0.5 rounded">已熱銷</span>
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
            {hotProductCandidateTotal > pageSize && (
              <div className="flex justify-center gap-2 mt-4">
                <button
                  onClick={() => fetchHotProductCandidates(hotProductCandidatePage - 1)}
                  disabled={hotProductCandidatePage === 0}
                  className="px-3 py-1 rounded border border-border-light text-sm disabled:opacity-50"
                >
                  上一頁
                </button>
                <span className="text-sm py-1">
                  {hotProductCandidatePage + 1} / {Math.ceil(hotProductCandidateTotal / pageSize)}
                </span>
                <button
                  onClick={() => fetchHotProductCandidates(hotProductCandidatePage + 1)}
                  disabled={(hotProductCandidatePage + 1) * pageSize >= hotProductCandidateTotal}
                  className="px-3 py-1 rounded border border-border-light text-sm disabled:opacity-50"
                >
                  下一頁
                </button>
              </div>
            )}

            <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-border-light">
              <button onClick={() => setShowAddHotProduct(false)} className="px-4 py-2 rounded-lg border border-border-light text-sm">取消</button>
              <button
                onClick={handleAddHotProducts}
                disabled={addingHotProducts || selectedHotCandidateIds.length === 0}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-50"
              >
                {addingHotProducts ? "加入中..." : `加入選取 (${selectedHotCandidateIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 展示設定 (Display Settings) */}
      <div className="mt-8 border-t border-border-light pt-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xl font-bold text-text-primary-light">展示設定</h3>
            <p className="text-sm text-text-secondary-light mt-1">編輯首頁人氣商品與各國熱銷專區顯示</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { id: "popular", label: "首頁人氣商品", count: displaySettings.popular?.length || 0 },
            { id: "korea", label: "韓國熱銷商品", count: displaySettings.korea?.length || 0 },
            { id: "japan", label: "日本熱銷商品", count: displaySettings.japan?.length || 0 },
            { id: "thailand", label: "泰國趨勢商品", count: displaySettings.thailand?.length || 0 },
          ].map((item) => (
            <div key={item.id} className="p-4 rounded-xl border border-border-light bg-card-light flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-text-primary-light">{item.label}</h4>
                <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full">
                  {item.count} 商品
                </span>
              </div>
              <button
                onClick={() => {
                  setActiveDisplayTab(item.id as any);
                  setShowDisplaySettingsDrawer(true);
                  fetchDisplayCandidates(0);
                  setSelectedDisplayCandidateIds([]);
                }}
                className="w-full py-2 rounded-lg border border-border-light text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                編輯內容
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 展示設定抽屜 (Drawer) */}
      {showDisplaySettingsDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="w-full max-w-2xl h-full bg-white shadow-xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-6 border-b border-border-light">
              <div>
                <h3 className="text-xl font-bold text-text-primary-light">
                  {activeDisplayTab === "popular" ? "首頁人氣商品" :
                    activeDisplayTab === "korea" ? "韓國熱銷商品" :
                      activeDisplayTab === "japan" ? "日本熱銷商品" : "泰國趨勢商品"}
                </h3>
                <p className="text-sm text-text-secondary-light mt-1">
                  已選擇 {displaySettings[activeDisplayTab]?.length || 0} 個商品
                </p>
              </div>
              <button onClick={() => setShowDisplaySettingsDrawer(false)} className="text-text-secondary-light hover:text-text-primary-light">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* 已選商品列表 */}
            <div className="p-4 border-b border-border-light bg-white">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-bold text-text-primary-light">已設定商品 ({currentSelectedProducts.length})</h4>
                {currentSelectedProducts.some(p => p.is_missing) && (
                  <button 
                    onClick={handleRemoveInvalidDisplayProducts}
                    className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 font-medium"
                  >
                    移除所有失效商品
                  </button>
                )}
              </div>
              {loadingSelectedProducts ? (
                <p className="text-sm text-text-secondary-light">載入中...</p>
              ) : currentSelectedProducts.length === 0 ? (
                <p className="text-sm text-text-secondary-light">尚未設定任何商品</p>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {currentSelectedProducts.map(p => (
                    <div key={p.id} className={`flex-shrink-0 w-32 border rounded-lg p-2 relative group ${p.is_missing ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                      <button
                        onClick={() => handleRemoveDisplayProducts([p.id])}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
                        title="移除"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                      <div className="aspect-square w-full bg-gray-200 rounded mb-2 overflow-hidden">
                        {p.cover_image_url ? (
                          <img src={p.cover_image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <span className="material-symbols-outlined">image_not_supported</span>
                          </div>
                        )}
                      </div>
                      <p className={`text-xs font-medium truncate ${p.is_missing ? 'text-red-600' : 'text-text-primary-light'}`}>
                        {p.title_zh || p.title_original}
                      </p>
                      {p.is_missing && <p className="text-[10px] text-red-500">已失效</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-b border-border-light bg-gray-50">
              <h4 className="text-sm font-bold text-text-primary-light mb-2">新增商品</h4>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="搜尋商品..."
                  value={displayCandidateSearch}
                  onChange={(e) => {
                    setDisplayCandidateSearch(e.target.value);
                    setDisplayCandidatePage(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") fetchDisplayCandidates(0);
                  }}
                  className="flex-1 rounded-lg border border-border-light px-3 py-2 text-sm"
                />
                <button
                  onClick={() => fetchDisplayCandidates(0)}
                  className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium"
                >
                  搜尋
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {displayCandidates.length === 0 ? (
                <div className="text-center py-10 text-text-secondary-light">查無商品</div>
              ) : (
                <div className="space-y-2">
                  {displayCandidates.map((p) => (
                    <div key={p.id} className={`flex items-center gap-3 p-3 rounded-lg border ${p.is_already_added || selectedDisplayCandidateIds.includes(p.id) ? "border-primary/30 bg-primary/5" : "border-border-light bg-white"}`}>
                      <input
                        type="checkbox"
                        checked={p.is_already_added || selectedDisplayCandidateIds.includes(p.id)}
                        onChange={() => {
                          if (p.is_already_added) {
                            handleRemoveDisplayProducts([p.id]);
                            p.is_already_added = false;
                          } else {
                            setSelectedDisplayCandidateIds(prev =>
                              prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                            );
                          }
                        }}
                        className="w-5 h-5 text-primary rounded focus:ring-primary"
                      />
                      <div className="w-12 h-12 bg-gray-100 rounded-md flex-shrink-0 overflow-hidden">
                        {p.cover_image_url ? (
                          <img src={p.cover_image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <span className="material-symbols-outlined text-lg">image</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary-light truncate">{p.title_zh || p.title_original}</p>
                        <p className="text-xs text-text-secondary-light">{p.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">NT$ {p.retail_price_twd}</p>
                        {p.is_already_added && <span className="text-xs text-success font-medium">已加入</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {displayCandidateTotal > pageSize && (
                <div className="flex justify-center gap-2 mt-6">
                  <button
                    onClick={() => fetchDisplayCandidates(displayCandidatePage - 1)}
                    disabled={displayCandidatePage === 0}
                    className="px-3 py-1 rounded border border-border-light text-sm disabled:opacity-50"
                  >
                    上一頁
                  </button>
                  <span className="text-sm py-1">
                    {displayCandidatePage + 1} / {Math.ceil(displayCandidateTotal / pageSize)}
                  </span>
                  <button
                    onClick={() => fetchDisplayCandidates(displayCandidatePage + 1)}
                    disabled={(displayCandidatePage + 1) * pageSize >= displayCandidateTotal}
                    className="px-3 py-1 rounded border border-border-light text-sm disabled:opacity-50"
                  >
                    下一頁
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border-light bg-white flex justify-between items-center">
              <span className="text-sm text-text-secondary-light">
                已選取 {selectedDisplayCandidateIds.length} 個新商品
              </span>
              <div className="flex gap-3">
                <button onClick={() => setShowDisplaySettingsDrawer(false)} className="px-4 py-2 rounded-lg border border-border-light text-sm">關閉</button>
                <button
                  onClick={handleAddDisplayProducts}
                  disabled={selectedDisplayCandidateIds.length === 0 || savingDisplaySettings}
                  className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-50"
                >
                  {savingDisplaySettings ? "儲存中..." : "確認加入"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
