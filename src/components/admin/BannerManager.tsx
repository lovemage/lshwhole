import { useState, useEffect } from "react";

export default function BannerManager() {
  const [bannerTab, setBannerTab] = useState<"index" | "products">("index");
  const [indexBanners, setIndexBanners] = useState<any[]>([]);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [newIndexBanner, setNewIndexBanner] = useState({
    image_url: "",
    title: "",
    description: "",
    link_url: "",
    sort: 0,
    active: true,
  });
  const [indexInterval, setIndexInterval] = useState<number>(5);

  // 商品頁橫幅狀態
  const [productsBanners, setProductsBanners] = useState<any[]>([]);
  const [newProductsBanner, setNewProductsBanner] = useState({
    image_url: "",
    sort: 0,
    active: true,
  });

  useEffect(() => {
    if (bannerTab === "index") {
      fetchIndexBanners();
      fetchIndexInterval();
    } else {
      fetchProductsBanners();
    }
  }, [bannerTab]);

  const fetchIndexBanners = async () => {
    setBannerLoading(true);
    try {
      const res = await fetch("/api/banners/index");
      const j = await res.json().catch(() => ({}));
      if (res.ok) setIndexBanners(Array.isArray(j.data) ? j.data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setBannerLoading(false);
    }
  };

  const fetchIndexInterval = async () => {
    try {
      const res = await fetch("/api/banner-settings?page_type=index");
      if (res.ok) {
        const j = await res.json().catch(() => ({}));
        if (j?.data?.carousel_interval != null) setIndexInterval(Number(j.data.carousel_interval));
      }
    } catch { }
  };

  const saveIndexInterval = async () => {
    try {
      const res = await fetch("/api/banner-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_type: "index", carousel_interval: Number(indexInterval || 5) }),
      });
      if (res.ok) alert("輪播秒數已保存");
      else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || "保存失敗");
      }
    } catch {
      alert("保存失敗，請稍後再試");
    }
  };

  const handleUpload = async (file: File | undefined, onSuccess: (url: string) => void) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setBannerLoading(true);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        onSuccess(data.url);
      } else {
        alert("Upload failed: " + (data.error || "Unknown error"));
      }
    } catch (e) {
      console.error(e);
      alert("Upload failed");
    } finally {
      setBannerLoading(false);
    }
  };

  const createIndexBanner = async () => {
    if (!newIndexBanner.image_url.trim()) return alert("請輸入圖片網址");
    try {
      const res = await fetch("/api/banners/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newIndexBanner),
      });
      if (res.ok) {
        setNewIndexBanner({ image_url: "", title: "", description: "", link_url: "", sort: 0, active: true });
        fetchIndexBanners();
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || "新增失敗");
      }
    } catch {
      alert("新增失敗，請稍後再試");
    }
  };

  const updateIndexBanner = async (id: number, patch: any) => {
    const res = await fetch(`/api/banners/index?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "更新失敗");
    }
  };

  const deleteIndexBanner = async (id: number) => {
    if (!confirm("確定刪除此橫幅？")) return;
    const res = await fetch(`/api/banners/index?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchIndexBanners();
    else {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "刪除失敗");
    }
  };

  const commitIndexBannerOrder = async (arr: any[]) => {
    for (let i = 0; i < arr.length; i++) {
      const it = arr[i];
      await updateIndexBanner(it.id, { sort: i });
    }
    fetchIndexBanners();
  };

  const moveIndexOrder = async (idx: number, dir: -1 | 1) => {
    const arr = [...indexBanners];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    const tmp = arr[idx];
    arr[idx] = arr[j];
    arr[j] = tmp;
    setIndexBanners(arr);
    await commitIndexBannerOrder(arr);
  };

  // 橫幅：商品頁
  const fetchProductsBanners = async () => {
    setBannerLoading(true);
    try {
      const res = await fetch("/api/banners/products");
      const j = await res.json().catch(() => ({}));
      if (res.ok) setProductsBanners(Array.isArray(j.data) ? j.data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setBannerLoading(false);
    }
  };

  const createProductsBanner = async () => {
    if (!newProductsBanner.image_url.trim()) return alert("請輸入圖片網址");
    try {
      const res = await fetch("/api/banners/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProductsBanner),
      });
      if (res.ok) {
        setNewProductsBanner({ image_url: "", sort: 0, active: true });
        fetchProductsBanners();
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || "新增失敗");
      }
    } catch {
      alert("新增失敗，請稍後再試");
    }
  };

  const updateProductsBanner = async (id: number, patch: any) => {
    const res = await fetch(`/api/banners/products?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "更新失敗");
    }
  };

  const deleteProductsBanner = async (id: number) => {
    if (!confirm("確定刪除此橫幅？")) return;
    const res = await fetch(`/api/banners/products?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchProductsBanners();
    else {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "刪除失敗");
    }
  };

  const commitProductsBannerOrder = async (arr: any[]) => {
    for (let i = 0; i < arr.length; i++) {
      const it = arr[i];
      await updateProductsBanner(it.id, { sort: i });
    }
    fetchProductsBanners();
  };

  const moveProductsOrder = async (idx: number, dir: -1 | 1) => {
    const arr = [...productsBanners];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    const tmp = arr[idx];
    arr[idx] = arr[j];
    arr[j] = tmp;
    setProductsBanners(arr);
    await commitProductsBannerOrder(arr);
  };

  return (
    <div className="py-6 space-y-6">
      <h2 className="text-2xl font-bold text-text-primary-light">橫幅管理</h2>

      {/* 內分頁：首頁/商品頁 */}
      <div className="flex gap-2 border-b border-border-light overflow-x-auto pb-2">
        <button
          onClick={() => setBannerTab("index")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${bannerTab === "index"
            ? "border-primary text-primary"
            : "border-transparent text-text-secondary-light hover:text-text-primary-light"
            }`}
        >
          首頁橫幅
        </button>
        <button
          onClick={() => setBannerTab("products")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${bannerTab === "products"
            ? "border-primary text-primary"
            : "border-transparent text-text-secondary-light hover:text-text-primary-light"
            }`}
        >
          商品頁橫幅
        </button>
      </div>

      {/* 首頁橫幅：輪播設定 */}
      {bannerTab === "index" && (
        <>
          <div className="rounded-xl border border-border-light bg-card-light p-4">
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <label className="text-sm text-text-secondary-light">輪播秒數</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={indexInterval}
                  onChange={(e) => setIndexInterval(Math.max(1, Math.floor(Number(e.target.value || 1))))}
                  className="mt-1 w-32 rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
                />
              </div>
              <button onClick={saveIndexInterval} className="px-4 py-2 rounded-lg bg-primary text-white text-sm">保存輪播秒數</button>
            </div>
          </div>

          {/* 新增首頁橫幅 */}
          <div className="rounded-xl border border-border-light bg-card-light p-4">
            <h3 className="text-lg font-bold text-text-primary-light mb-3">新增首頁橫幅</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-text-secondary-light">圖片網址 (或上傳)</label>
                <div className="flex gap-2">
                  <input value={newIndexBanner.image_url} onChange={(e) => setNewIndexBanner({ ...newIndexBanner, image_url: e.target.value })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" placeholder="輸入網址或上傳圖片" />
                  <label className="mt-1 flex items-center justify-center px-3 py-2 bg-gray-100 border border-border-light rounded-lg cursor-pointer hover:bg-gray-200">
                    <span className="material-symbols-outlined text-sm">upload</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e.target.files?.[0], (url) => setNewIndexBanner({ ...newIndexBanner, image_url: url }))} />
                  </label>
                </div>
              </div>
              <div>
                <label className="text-sm text-text-secondary-light">連結（可選）</label>
                <input value={newIndexBanner.link_url} onChange={(e) => setNewIndexBanner({ ...newIndexBanner, link_url: e.target.value })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-text-secondary-light">標題（可選）</label>
                <input value={newIndexBanner.title} onChange={(e) => setNewIndexBanner({ ...newIndexBanner, title: e.target.value })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-text-secondary-light">描述（可選）</label>
                <input value={newIndexBanner.description} onChange={(e) => setNewIndexBanner({ ...newIndexBanner, description: e.target.value })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-text-secondary-light">排序（數字越小越前面）</label>
                <input type="number" value={newIndexBanner.sort} onChange={(e) => setNewIndexBanner({ ...newIndexBanner, sort: Number(e.target.value || 0) })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
              </div>
              <label className="mt-6 inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={newIndexBanner.active} onChange={(e) => setNewIndexBanner({ ...newIndexBanner, active: e.target.checked })} />
                啟用
              </label>
            </div>
            <div className="mt-3">
              <button onClick={createIndexBanner} className="px-4 py-2 rounded-lg bg-primary text-white text-sm">新增</button>
            </div>
          </div>

          {/* 現有首頁橫幅 */}
          <div className="rounded-xl border border-border-light bg-card-light p-4">
            <h3 className="text-lg font-bold text-text-primary-light mb-3">現有橫幅</h3>
            {bannerLoading ? (
              <p className="text-text-secondary-light">載入中...</p>
            ) : indexBanners.length === 0 ? (
              <p className="text-text-secondary-light">暫無資料</p>
            ) : (
              <div className="space-y-4">
                {indexBanners.map((b, idx) => (
                  <div key={b.id} className="flex gap-3 items-start">
                    <img src={b.image_url} alt="" className="h-16 w-28 object-cover border border-border-light bg-background-light" />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                      <input value={b.image_url} onChange={(e) => setIndexBanners(prev => prev.map((x: any, i: number) => i === idx ? { ...x, image_url: e.target.value } : x))} placeholder="圖片網址" className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                      <input value={b.title || ""} onChange={(e) => setIndexBanners(prev => prev.map((x: any, i: number) => i === idx ? { ...x, title: e.target.value } : x))} placeholder="標題（可選）" className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                      <input value={b.description || ""} onChange={(e) => setIndexBanners(prev => prev.map((x: any, i: number) => i === idx ? { ...x, description: e.target.value } : x))} placeholder="描述（可選）" className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                      <input value={b.link_url || ""} onChange={(e) => setIndexBanners(prev => prev.map((x: any, i: number) => i === idx ? { ...x, link_url: e.target.value } : x))} placeholder="連結（可選）" className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={!!b.active} onChange={(e) => setIndexBanners(prev => prev.map((x: any, i: number) => i === idx ? { ...x, active: e.target.checked } : x))} />
                        啟用
                      </label>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => moveIndexOrder(idx, -1)} disabled={idx === 0} className="px-3 py-1 rounded-lg border border-border-light text-sm disabled:opacity-50">上移</button>
                      <button onClick={() => moveIndexOrder(idx, 1)} disabled={idx === indexBanners.length - 1} className="px-3 py-1 rounded-lg border border-border-light text-sm disabled:opacity-50">下移</button>
                      <button onClick={() => updateIndexBanner(b.id, { image_url: b.image_url, title: b.title, description: b.description, link_url: b.link_url, active: b.active })} className="px-3 py-1 rounded-lg bg-primary text-white text-sm">更新</button>
                      <button onClick={() => deleteIndexBanner(b.id)} className="px-3 py-1 rounded-lg border border-danger text-danger text-sm">刪除</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* 商品頁橫幅 */}
      {bannerTab === "products" && (
        <>
          {/* 新增商品頁橫幅（僅圖片/排序/啟用） */}
          <div className="rounded-xl border border-border-light bg-card-light p-4">
            <h3 className="text-lg font-bold text-text-primary-light mb-3">新增商品頁橫幅</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-text-secondary-light">圖片網址 (或上傳)</label>
                <div className="flex gap-2">
                  <input value={newProductsBanner.image_url} onChange={(e) => setNewProductsBanner({ ...newProductsBanner, image_url: e.target.value })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" placeholder="輸入網址或上傳圖片" />
                  <label className="mt-1 flex items-center justify-center px-3 py-2 bg-gray-100 border border-border-light rounded-lg cursor-pointer hover:bg-gray-200">
                    <span className="material-symbols-outlined text-sm">upload</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e.target.files?.[0], (url) => setNewProductsBanner({ ...newProductsBanner, image_url: url }))} />
                  </label>
                </div>
              </div>
              <div>
                <label className="text-sm text-text-secondary-light">排序（數字越小越前面）</label>
                <input type="number" value={newProductsBanner.sort} onChange={(e) => setNewProductsBanner({ ...newProductsBanner, sort: Number(e.target.value || 0) })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
              </div>
              <label className="mt-6 inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={newProductsBanner.active} onChange={(e) => setNewProductsBanner({ ...newProductsBanner, active: e.target.checked })} />
                啟用
              </label>
            </div>
            <div className="mt-3">
              <button onClick={createProductsBanner} className="px-4 py-2 rounded-lg bg-primary text-white text-sm">新增</button>
            </div>
          </div>

          {/* 現有商品頁橫幅 */}
          <div className="rounded-xl border border-border-light bg-card-light p-4">
            <h3 className="text-lg font-bold text-text-primary-light mb-3">現有橫幅</h3>
            {bannerLoading ? (
              <p className="text-text-secondary-light">載入中...</p>
            ) : productsBanners.length === 0 ? (
              <p className="text-text-secondary-light">暫無資料</p>
            ) : (
              <div className="space-y-4">
                {productsBanners.map((b, idx) => (
                  <div key={b.id} className="flex gap-3 items-start">
                    <img src={b.image_url} alt="" className="h-16 w-28 object-cover border border-border-light bg-background-light" />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                      <input value={b.image_url} onChange={(e) => setProductsBanners(prev => prev.map((x: any, i: number) => i === idx ? { ...x, image_url: e.target.value } : x))} placeholder="圖片網址" className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={!!b.active} onChange={(e) => setProductsBanners(prev => prev.map((x: any, i: number) => i === idx ? { ...x, active: e.target.checked } : x))} />
                        啟用
                      </label>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => moveProductsOrder(idx, -1)} disabled={idx === 0} className="px-3 py-1 rounded-lg border border-border-light text-sm disabled:opacity-50">上移</button>
                      <button onClick={() => moveProductsOrder(idx, 1)} disabled={idx === productsBanners.length - 1} className="px-3 py-1 rounded-lg border border-border-light text-sm disabled:opacity-50">下移</button>
                      <button onClick={() => updateProductsBanner(b.id, { image_url: b.image_url, active: b.active })} className="px-3 py-1 rounded-lg bg-primary text-white text-sm">更新</button>
                      <button onClick={() => deleteProductsBanner(b.id)} className="px-3 py-1 rounded-lg border border-danger text-danger text-sm">刪除</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
