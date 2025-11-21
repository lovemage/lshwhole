"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BannerCarousel from "@/components/BannerCarousel";
import { supabase } from "@/lib/supabase";
import CartBadge from "@/components/CartBadge";
import { useMemberPermissions } from "@/lib/memberPermissions";

interface RetailProduct {
  id: number;
  title: string;
  retail_price_twd: number | null;
  wholesale_price_twd: number | null;
  cover_image_url: string | null;
}

interface Category { id: number; name: string; level: number; sort: number; icon?: string; retail_visible?: boolean; }
interface Relation { parent_category_id: number; child_category_id: number; }
interface Tag { id: number; name: string; slug: string; sort: number; }

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const router = useRouter();

  // 分類與標籤
  const [categoriesAll, setCategoriesAll] = useState<Category[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ email: string | null } | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  // 會員權限
  const { loading: permissionsLoading, error: permissionsError, data: permissions } = useMemberPermissions();

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user ?? null;
        setAccessToken(session?.access_token ?? null);
        if (user) {
          setCurrentUser({ email: user.email ?? null });
          const { data: walletData, error: walletError } = await supabase
            .from("wallets")
            .select("balance_twd")
            .eq("user_id", user.id)
            .maybeSingle();
          if (!walletError && walletData) {
            setWalletBalance(walletData.balance_twd ?? 0);
          } else {
            setWalletBalance(0);
          }
        } else {
          setCurrentUser(null);
          setWalletBalance(null);
        }
      } catch (e) {
        console.error("取得登入狀態失敗（商品列表）", e);
      }
    })();
  }, []);

  const [tags, setTags] = useState<Tag[]>([]);


  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("登出失敗", e);
    } finally {
      router.push("/");
    }
  };

  // 分類層級
  // 若後端有設定 retail_visible，則僅顯示零售端開放的 L1/L2 分類
  const l1Categories = useMemo(() => {
    const hasRetailFlag = categoriesAll.some((c) => c.retail_visible !== undefined);
    return categoriesAll
      .filter((c) => c.level === 1 && (!hasRetailFlag || c.retail_visible))
      .sort((a, b) => a.sort - b.sort);
  }, [categoriesAll]);
  const l2Categories = useMemo(() => {
    const hasRetailFlag = categoriesAll.some((c) => c.retail_visible !== undefined);
    return categoriesAll
      .filter((c) => c.level === 2 && (!hasRetailFlag || c.retail_visible))
      .sort((a, b) => a.sort - b.sort);
  }, [categoriesAll]);
  const l3Categories = useMemo(() => categoriesAll.filter((c) => c.level === 3).sort((a, b) => a.sort - b.sort), [categoriesAll]);

  // 選中的分類和標籤
  const [selectedL1Id, setSelectedL1Id] = useState<number | null>(null);
  const [selectedL2Id, setSelectedL2Id] = useState<number | null>(null);
  const [selectedL3Id, setSelectedL3Id] = useState<number | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);

  // 商品
  const [products, setProducts] = useState<RetailProduct[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 載入分類、關聯和標籤
    (async () => {
      try {
        const [cRes, rRes, tRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/category-relations"),
          fetch("/api/tags"),
        ]);
        const cats: Category[] = cRes.ok ? await cRes.json() : [];
        const rels: Relation[] = rRes.ok ? await rRes.json() : [];
        const tagList: Tag[] = tRes.ok ? await tRes.json() : [];
        setCategoriesAll(cats);
        setRelations(rels);
        setTags(tagList);
      } catch (e) {
        console.error("載入分類和標籤失敗", e);
      }
    })();
  }, []);

  const fetchProducts = async (opts?: {
    categoryId?: number | null;
    tagId?: number | null;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    params.set("limit", "48");
    if (opts?.search) params.set("search", opts.search);
    if (opts?.categoryId) params.set("category_id", String(opts.categoryId));
    if (opts?.tagId) params.set("tag_id", String(opts.tagId));
    setLoading(true);
    try {
      const res = await fetch(`/api/retail/products?${params.toString()}` , {
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
      });
      if (res.ok) {
        const j = await res.json();
        setProducts(j.data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  // 計算可用的子分類
  const availableL2Categories = useMemo(() => {
    if (!selectedL1Id) return l2Categories;
    const childIds = relations
      .filter(r => r.parent_category_id === selectedL1Id)
      .map(r => r.child_category_id);
    return l2Categories.filter(c => childIds.includes(c.id));
  }, [selectedL1Id, l2Categories, relations]);

  const availableL3Categories = useMemo(() => {
    if (!selectedL2Id) return l3Categories;
    const childIds = relations
      .filter(r => r.parent_category_id === selectedL2Id)
      .map(r => r.child_category_id);
    return l3Categories.filter(c => childIds.includes(c.id));
  }, [selectedL2Id, l3Categories, relations]);

  // 獲取當前選中的最深層分類 ID
  const getCurrentCategoryId = () => {
    return selectedL3Id || selectedL2Id || selectedL1Id;
  };

  // 分類選擇聯動效果
  const handleL1Change = (id: number | null) => {
    setSelectedL1Id(id);
    setSelectedL2Id(null);
    setSelectedL3Id(null);
  };

  const handleL2Change = (id: number | null) => {
    setSelectedL2Id(id);
    setSelectedL3Id(null);
  };

  const handleL3Change = (id: number | null) => {
    setSelectedL3Id(id);
  };

  const handleTagChange = (id: number | null) => {
    setSelectedTagId(id);
  };

  // 重置所有篩選
  const resetAllFilters = () => {
    setSelectedL1Id(null);
    setSelectedL2Id(null);
    setSelectedL3Id(null);
    setSelectedTagId(null);
  };

  useEffect(() => {
    fetchProducts({
      categoryId: getCurrentCategoryId(),
      tagId: selectedTagId,
      search: searchTerm.trim()
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedL1Id, selectedL2Id, selectedL3Id, selectedTagId]);

  // 搜尋即時（可加 debounce），這裡直接觸發
  useEffect(() => {
    const h = setTimeout(() => {
      fetchProducts({
        categoryId: getCurrentCategoryId(),
        tagId: selectedTagId,
        search: searchTerm.trim()
      });
    }, 250);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const sortedProducts = useMemo(() => {
    const arr = [...products];
    if (sortBy === "price-low") return arr.sort((a,b)=>(a.retail_price_twd||0)-(b.retail_price_twd||0));
    if (sortBy === "price-high") return arr.sort((a,b)=>(b.retail_price_twd||0)-(a.retail_price_twd||0));
    return arr; // newest 由 API 按 created_at desc
  }, [products, sortBy]);

  // 獲取當前篩選的標題
  const getFilterTitle = () => {
    const parts = [];
    if (selectedL1Id) parts.push(l1Categories.find(c=>c.id===selectedL1Id)?.name);
    if (selectedL2Id) parts.push(l2Categories.find(c=>c.id===selectedL2Id)?.name);
    if (selectedL3Id) parts.push(l3Categories.find(c=>c.id===selectedL3Id)?.name);
    if (selectedTagId) parts.push(`#${tags.find(t=>t.id===selectedTagId)?.name}`);
    return parts.length > 0 ? parts.join(" > ") + " 商品" : "所有商品";
  };

  return (
    <div style={{ backgroundColor: "#f8f8f5" }} className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between whitespace-nowrap border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-3">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3 text-gray-800">
              <div className="size-6 text-primary">
                <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path d="M44 11.2727C44 14.0109 39.8386 16.3957 33.69 17.6364C39.8386 18.877 44 21.2618 44 24C44 26.7382 39.8386 29.123 33.69 30.3636C39.8386 31.6043 44 33.9891 44 36.7273C44 40.7439 35.0457 44 24 44C12.9543 44 4 40.7439 4 36.7273C4 33.9891 8.16144 31.6043 14.31 30.3636C8.16144 29.123 4 26.7382 4 24C4 21.2618 8.16144 18.877 14.31 17.6364C8.16144 16.3957 4 14.0109 4 11.2727C4 7.25611 12.9543 4 24 4C35.0457 4 44 7.25611 44 11.2727Z" fill="currentColor"></path>
                </svg>
              </div>
              <h2 className="text-gray-900 text-lg font-bold leading-tight tracking-[-0.015em]">Lsx wholesale</h2>
            </div>
            <nav className="hidden lg:flex items-center gap-8">
              <Link className="text-gray-700 hover:text-primary text-sm font-medium leading-normal transition-colors" href="/">首頁</Link>
              <Link className="text-gray-700 hover:text-primary text-sm font-medium leading-normal transition-colors" href="/products">商品</Link>
              <Link className="text-gray-700 hover:text-primary text-sm font-medium leading-normal transition-colors" href="#">韓國</Link>
              <Link className="text-gray-700 hover:text-primary text-sm font-medium leading-normal transition-colors" href="#">日本</Link>
              <Link className="text-gray-700 hover:text-primary text-sm font-medium leading-normal transition-colors" href="#">泰國</Link>
            </nav>
          </div>
          <div className="flex gap-2 items-center">
            {currentUser ? (
              <>
                <span className="text-sm text-gray-700">
                  儲值金：
                  <span className="font-semibold">NT$ {walletBalance ?? 0}</span>
                </span>
                <Link
                  href="/member"
                  className="flex min-w-[96px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-200 text-gray-800 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-gray-300 transition-colors"
                >
                  <span className="truncate">會員中心</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-100 text-gray-700 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-gray-200 transition-colors"
                >
                  <span className="truncate">登出</span>
                </button>
                <CartBadge />
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors"
                >
                  <span className="truncate">註冊</span>
                </Link>
                <Link
                  href="/login"
                  className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-200 text-gray-800 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-gray-300 transition-colors"
                >
                  <span className="truncate">登入</span>
                </Link>
                <CartBadge />
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <div className="flex flex-col gap-8">
          {/* Banner Section */}
          <section>
            <BannerCarousel
              type="products"
              className="w-full h-[50vh] min-h-[400px] max-h-[600px] rounded-xl overflow-hidden"
            />
          </section>

          {/* Filters Section */}
          <section className="flex flex-col gap-6">
            {/* Search Bar */}
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="搜尋商品..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="newest">最新</option>
                <option value="price-low">價格：低到高</option>
                <option value="price-high">價格：高到低</option>
              </select>
            </div>

            {/* 四層分類導航 */}
            <div className="space-y-4">
              {/* L1 分類 */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">國家/地區</h3>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleL1Change(null)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedL1Id === null
                        ? "bg-primary text-white"
                        : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                    }`}
                  >
                    全部
                  </button>
                  {l1Categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleL1Change(c.id)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors flex flex-col items-center gap-1 ${
                        selectedL1Id === c.id
                          ? "bg-primary text-white"
                          : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                      }`}
                    >
                      {c.icon && (
                        /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(c.icon) ? (
                          <span className="text-lg">{c.icon}</span>
                        ) : (
                          <span className="material-symbols-outlined text-lg">
                            {c.icon}
                          </span>
                        )
                      )}
                      <span className="text-xs">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* L2 分類 */}
              {(selectedL1Id || availableL2Categories.length > 0) && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">商品類型</h3>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleL2Change(null)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        selectedL2Id === null
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      全部
                    </button>
                    {availableL2Categories.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleL2Change(c.id)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                          selectedL2Id === c.id
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {c.icon && (
                          /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(c.icon) ? (
                            <span className="text-sm">{c.icon}</span>
                          ) : (
                            <span className="material-symbols-outlined text-sm">
                              {c.icon}
                            </span>
                          )
                        )}
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* L3 分類 */}
              {(selectedL2Id || availableL3Categories.length > 0) && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">細分類別</h3>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleL3Change(null)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        selectedL3Id === null
                          ? "bg-green-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      全部
                    </button>
                    {availableL3Categories.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleL3Change(c.id)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                          selectedL3Id === c.id
                            ? "bg-green-500 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {c.icon && (
                          /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(c.icon) ? (
                            <span className="text-sm">{c.icon}</span>
                          ) : (
                            <span className="material-symbols-outlined text-sm">
                              {c.icon}
                            </span>
                          )
                        )}
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 商品標籤 */}
              {tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">商品標籤</h3>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleTagChange(null)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        selectedTagId === null
                          ? "bg-purple-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      全部
                    </button>
                    {tags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => handleTagChange(tag.id)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          selectedTagId === tag.id
                            ? "bg-purple-500 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 重置篩選按鈕 */}
              {(selectedL1Id || selectedL2Id || selectedL3Id || selectedTagId) && (
                <div className="flex justify-end">
                  <button
                    onClick={resetAllFilters}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    清除所有篩選
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Products Grid */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {getFilterTitle()}
            </h2>
            {loading && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-2 text-gray-600">載入中...</p>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {sortedProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="group relative flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1"
                >
                  <div className="aspect-square w-full overflow-hidden bg-gray-100">
                    <img
                      src={product.cover_image_url || "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1200&auto=format&fit=crop"}
                      alt={product.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3 flex flex-col grow">
                    <h3 className="text-sm font-medium text-gray-800 leading-snug grow">{product.title}</h3>
                    <div className="mt-2 flex flex-col items-start gap-1">
                      {/* 根據會員等級顯示價格 */}
                      {permissions?.permissions.price_type === 'none' && (
                        <p className="text-sm text-gray-500">登入後可見價格</p>
                      )}
                      {permissions?.permissions.price_type === 'retail' && (
                        <>
                          <p className="text-xs text-gray-500">零售價</p>
                          <p className="text-base font-bold text-gray-900">
                            NT${product.retail_price_twd ?? "-"} <span className="text-xs font-normal text-gray-500">/ 件</span>
                          </p>
                        </>
                      )}
                      {permissions?.permissions.price_type === 'wholesale' && (
                        <>
                          <p className="text-xs text-primary">批發價</p>
                          <p className="text-base font-bold text-primary">
                            NT${product.wholesale_price_twd ?? product.retail_price_twd ?? "-"} <span className="text-xs font-normal text-gray-500">/ 件</span>
                          </p>
                          {product.retail_price_twd && (
                            <p className="text-xs text-gray-500">
                              零售價 NT${product.retail_price_twd}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {sortedProducts.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg">找不到符合條件的商品</p>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase">網站導航</h3>
              <ul className="space-y-2">
                <li><Link className="text-gray-700 hover:text-primary text-sm font-medium leading-normal transition-colors" href="#">商品</Link></li>
                <li><Link className="text-gray-700 hover:text-primary text-sm font-medium leading-normal transition-colors" href="#">韓國</Link></li>
                <li><Link className="text-gray-700 hover:text-primary text-sm font-medium leading-normal transition-colors" href="#">日本</Link></li>
                <li><Link className="text-gray-700 hover:text-primary text-sm font-medium leading-normal transition-colors" href="#">泰國</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase">客戶服務</h3>
              <ul className="space-y-2">
                <li><Link className="text-gray-700 hover:text-primary text-sm font-medium leading-normal transition-colors" href="#">聯絡我們</Link></li>
                <li><Link className="text-gray-700 hover:text-primary text-sm font-medium leading-normal transition-colors" href="#">常見問題</Link></li>
                <li><Link className="text-gray-700 hover:text-primary text-sm font-medium leading-normal transition-colors" href="#">運送資訊</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase">法律</h3>
              <ul className="space-y-2">
                <li><Link className="text-gray-700 hover:text-primary text-sm font-medium leading-normal transition-colors" href="/terms-of-service">服務條款</Link></li>
                <li><Link className="text-gray-700 hover:text-primary text-sm font-medium leading-normal transition-colors" href="/privacy-policy">隱私政策</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase">電子報</h3>
              <p className="text-gray-600 text-sm">獲取最新的產品更新和即將推出的銷售資訊。</p>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-200 pt-8 flex flex-col sm:flex-row items-center justify-between">
            <p className="text-gray-600 text-sm">© {new Date().getFullYear()} Lsx 批發。版權所有。</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
