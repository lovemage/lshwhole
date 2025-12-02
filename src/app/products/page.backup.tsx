"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BannerCarousel from "@/components/BannerCarousel";
import { supabase } from "@/lib/supabase";
import { useMemberPermissions } from "@/lib/memberPermissions";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface RetailProduct {
  id: number;
  title: string;
  retail_price_twd: number | null;
  wholesale_price_twd: number | null;
  cover_image_url: string | null;
}

interface Category { id: number; name: string; level: number; sort: number; icon?: string; retail_visible?: boolean; }
interface Relation { parent_category_id: number; child_category_id: number; }
interface Tag { id: number; name: string; slug: string; sort: number; category?: string; }

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  // 分類與標籤
  const [categoriesAll, setCategoriesAll] = useState<Category[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);

  const [accessToken, setAccessToken] = useState<string | null>(null);

  // 會員權限
  const { loading: permissionsLoading, error: permissionsError, data: permissions } = useMemberPermissions();

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setAccessToken(session?.access_token ?? null);
      } catch (e) {
        console.error("取得登入狀態失敗（商品列表）", e);
      }
    })();
  }, []);

  const [tags, setTags] = useState<Tag[]>([]);

  // 分類層級
  const l1Categories = useMemo(() => {
    return categoriesAll
      .filter((c) => c.level === 1)
      .sort((a, b) => a.sort - b.sort);
  }, [categoriesAll]);
  const l2Categories = useMemo(() => {
    return categoriesAll
      .filter((c) => c.level === 2)
      .sort((a, b) => a.sort - b.sort);
  }, [categoriesAll]);
  const l3Categories = useMemo(() => categoriesAll.filter((c) => c.level === 3).sort((a, b) => a.sort - b.sort), [categoriesAll]);

  // 選中的分類和標籤
  const [selectedL1Id, setSelectedL1Id] = useState<number | null>(null);
  const [selectedL2Id, setSelectedL2Id] = useState<number | null>(null);
  const [selectedL3Id, setSelectedL3Id] = useState<number | null>(null);
  // 多選標籤
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  // Category Accordion Expanded State
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<number>>(new Set());

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
    tagIds?: number[];
    search?: string;
  }) => {
    const params = new URLSearchParams();
    params.set("limit", "48");
    if (opts?.search) params.set("search", opts.search);
    if (opts?.categoryId) params.set("category_id", String(opts.categoryId));
    if (opts?.tagIds && opts.tagIds.length > 0) params.set("tag_ids", opts.tagIds.join(","));
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

  const getChildren = (parentId: number, level: number) => {
    const childIds = relations.filter(r => r.parent_category_id === parentId).map(r => r.child_category_id);
    return categoriesAll.filter(c => c.level === level && childIds.includes(c.id)).sort((a, b) => a.sort - b.sort);
  };

  // 獲取當前選中的最深層分類 ID
  const getCurrentCategoryId = () => {
    return selectedL3Id || selectedL2Id || selectedL1Id;
  };

  // 分類選擇 & 展開/收起 邏輯
  const toggleCategoryExpand = (id: number) => {
    setExpandedCategoryIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleL1Click = (id: number) => {
    // 若點擊的是當前選中的，則切換展開狀態
    if (selectedL1Id === id) {
       toggleCategoryExpand(id);
    } else {
       // 選中新的 L1，並展開它
       setSelectedL1Id(id);
       setSelectedL2Id(null);
       setSelectedL3Id(null);
       setExpandedCategoryIds(prev => new Set(prev).add(id));
    }
  };

  const handleL2Click = (id: number) => {
     if (selectedL2Id === id) {
       toggleCategoryExpand(id);
     } else {
       setSelectedL2Id(id);
       setSelectedL3Id(null);
       setExpandedCategoryIds(prev => new Set(prev).add(id));
     }
  };

  const handleL3Click = (id: number) => {
    if (selectedL3Id === id) {
       // 取消選中 L3，回退到 L2
       setSelectedL3Id(null); 
    } else {
       setSelectedL3Id(id);
    }
  };

  const toggleTag = (id: number) => {
    setSelectedTagIds(prev => {
      if (prev.includes(id)) return prev.filter(tid => tid !== id);
      return [...prev, id];
    });
  };

  // 重置所有篩選
  const resetAllFilters = () => {
    setSelectedL1Id(null);
    setSelectedL2Id(null);
    setSelectedL3Id(null);
    setSelectedTagIds([]);
    setExpandedCategoryIds(new Set());
  };

  useEffect(() => {
    fetchProducts({
      categoryId: getCurrentCategoryId(),
      tagIds: selectedTagIds,
      search: searchTerm.trim()
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedL1Id, selectedL2Id, selectedL3Id, selectedTagIds]);

  // 搜尋即時（可加 debounce），這裡直接觸發
  useEffect(() => {
    const h = setTimeout(() => {
      fetchProducts({
        categoryId: getCurrentCategoryId(),
        tagIds: selectedTagIds,
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
    if (selectedTagIds.length > 0) parts.push(`標籤(${selectedTagIds.length})`);
    return parts.length > 0 ? parts.join(" > ") + " 商品" : "所有商品";
  };

  const renderTagSection = (title: string, categoryCode: string | null, colorClass: string) => {
    const filteredTags = tags.filter(t => 
      categoryCode === null 
        ? (!t.category || t.category === "A2") 
        : t.category === categoryCode
    ).sort((a, b) => a.sort - b.sort);

    if (filteredTags.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-900 mb-3">{title}</h3>
        <div className="flex flex-wrap gap-2">
          {filteredTags.map(tag => {
            const isSelected = selectedTagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isSelected
                    ? `${colorClass} text-white shadow-sm ring-2 ring-offset-1 ring-offset-gray-50 ring-opacity-60`
                    : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {tag.name}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: "#f8f8f5" }} className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
      <Header />

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
        {/* Banner - Full Width */}
        <section className="mb-8">
          <BannerCarousel
            type="products"
            className="w-full h-[300px] md:h-[400px] rounded-2xl overflow-hidden shadow-sm"
          />
        </section>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar - Filters */}
          <aside className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-8">
            {/* Search (Mobile/Tablet usually top, but keeping consistently in sidebar or top area) */}
            <div className="lg:hidden mb-4">
              <input
                type="text"
                placeholder="搜尋商品..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            
            {/* Tags Filter */}
            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-gray-200/60">
               {renderTagSection("品牌分類", "A1", "bg-primary")}
               {renderTagSection("商品分類", null, "bg-blue-500")}
               {renderTagSection("活動分類", "A3", "bg-red-500")}
            </div>

            {/* Categories Accordion */}
            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-gray-200/60">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-900">分類瀏覽</h3>
                {(selectedL1Id || selectedTagIds.length > 0) && (
                  <button onClick={resetAllFilters} className="text-xs text-gray-500 hover:text-primary">
                    重置
                  </button>
                )}
              </div>
              
              <div className="space-y-1">
                {l1Categories.map(l1 => {
                   const isL1Expanded = expandedCategoryIds.has(l1.id);
                   const isL1Selected = selectedL1Id === l1.id;
                   
                   return (
                     <div key={l1.id} className="select-none">
                       {/* L1 Item */}
                       <div 
                         onClick={() => handleL1Click(l1.id)}
                         className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                           isL1Selected ? "bg-white shadow-sm text-primary font-bold" : "text-gray-700 hover:bg-gray-100/50"
                         }`}
                       >
                         <div className="flex items-center gap-2">
                           <span className="text-lg w-6 flex justify-center">{l1.icon}</span>
                           <span className="text-sm">{l1.name}</span>
                         </div>
                         <span className={`material-symbols-outlined text-sm transition-transform ${isL1Expanded ? "rotate-180" : ""}`}>
                           expand_more
                         </span>
                       </div>

                       {/* L2 List */}
                       {isL1Expanded && (
                         <div className="ml-3 pl-3 border-l border-gray-200 my-1 space-y-1">
                           {getChildren(l1.id, 2).map(l2 => {
                             const isL2Expanded = expandedCategoryIds.has(l2.id);
                             const isL2Selected = selectedL2Id === l2.id;
                             
                             return (
                               <div key={l2.id}>
                                 <div 
                                   onClick={(e) => { e.stopPropagation(); handleL2Click(l2.id); }}
                                   className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors ${
                                     isL2Selected ? "text-primary font-bold bg-primary/5" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/50"
                                   }`}
                                 >
                                   <span className="text-sm">{l2.name}</span>
                                   {getChildren(l2.id, 3).length > 0 && (
                                     <span className={`material-symbols-outlined text-xs text-gray-400 transition-transform ${isL2Expanded ? "rotate-180" : ""}`}>
                                       expand_more
                                     </span>
                                   )}
                                 </div>

                                 {/* L3 List */}
                                 {isL2Expanded && (
                                   <div className="ml-2 pl-2 border-l border-gray-100 mt-1 space-y-0.5">
                                      {getChildren(l2.id, 3).map(l3 => {
                                        const isL3Selected = selectedL3Id === l3.id;
                                        return (
                                          <div
                                            key={l3.id}
                                            onClick={(e) => { e.stopPropagation(); handleL3Click(l3.id); }}
                                            className={`px-2 py-1 rounded cursor-pointer text-xs transition-colors ${
                                              isL3Selected ? "text-primary font-bold bg-primary/5" : "text-gray-500 hover:text-gray-800"
                                            }`}
                                          >
                                            {l3.name}
                                          </div>
                                        );
                                      })}
                                   </div>
                                 )}
                               </div>
                             );
                           })}
                         </div>
                       )}
                     </div>
                   );
                })}
              </div>
            </div>
          </aside>

          {/* Right Content - Search & Grid */}
          <div className="flex-1 min-w-0">
             {/* Top Bar: Search & Sort */}
             <div className="flex flex-col sm:flex-row gap-4 mb-6 sticky top-20 z-10 bg-[#f8f8f5]/95 backdrop-blur-sm py-2">
                <div className="flex-1 relative hidden lg:block">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                  <input
                    type="text"
                    placeholder="搜尋商品..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                  <span className="text-sm text-gray-500 whitespace-nowrap">{products.length} 個商品</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    <option value="newest">最新上架</option>
                    <option value="price-low">價格：低到高</option>
                    <option value="price-high">價格：高到低</option>
                  </select>
                </div>
             </div>

             {/* Selected Filters Chips (Optional) */}
             {(selectedTagIds.length > 0 || selectedL1Id) && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedL1Id && (
                     <span className="inline-flex items-center px-2 py-1 rounded bg-gray-200 text-xs text-gray-700">
                        {l1Categories.find(c => c.id === selectedL1Id)?.name}
                        {selectedL2Id && ` > ${l2Categories.find(c => c.id === selectedL2Id)?.name}`}
                        {selectedL3Id && ` > ${l3Categories.find(c => c.id === selectedL3Id)?.name}`}
                        <button onClick={() => setSelectedL1Id(null)} className="ml-1 hover:text-red-500">×</button>
                     </span>
                  )}
                  {selectedTagIds.map(tid => {
                    const t = tags.find(tag => tag.id === tid);
                    if (!t) return null;
                    return (
                      <span key={tid} className="inline-flex items-center px-2 py-1 rounded bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                        {t.name}
                        <button onClick={() => toggleTag(tid)} className="ml-1 hover:text-red-500">×</button>
                      </span>
                    );
                  })}
                  <button onClick={resetAllFilters} className="text-xs text-gray-500 underline hover:text-gray-800 px-2">
                    清除全部
                  </button>
                </div>
             )}
             
             {/* Product Grid */}
             {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl aspect-[3/4] animate-pulse"></div>
                  ))}
                </div>
             ) : (
               <>
                 <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {sortedProducts.map((product) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.id}`}
                      className="group flex flex-col bg-white rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-transparent hover:border-gray-100"
                    >
                      <div className="aspect-square w-full overflow-hidden bg-gray-100 relative">
                        <img
                          src={product.cover_image_url || "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1200&auto=format&fit=crop"}
                          alt={product.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        {/* Quick Action Overlay (Optional) */}
                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="p-3 sm:p-4 flex flex-col grow">
                        <h3 className="text-sm text-gray-800 leading-snug grow line-clamp-2 font-medium group-hover:text-primary transition-colors">
                          {product.title}
                        </h3>
                        <div className="mt-3 flex flex-col items-start gap-0.5">
                          {permissions?.permissions.price_type === 'none' && (
                            <p className="text-xs text-gray-500 font-medium">登入查看價格</p>
                          )}
                          {permissions?.permissions.price_type === 'retail' && (
                            <div className="flex items-baseline gap-1">
                              <span className="text-base font-bold text-gray-900">NT$ {product.retail_price_twd?.toLocaleString()}</span>
                            </div>
                          )}
                          {permissions?.permissions.price_type === 'wholesale' && (
                            <div className="flex flex-col">
                              <span className="text-base font-bold text-primary">NT$ {product.wholesale_price_twd?.toLocaleString() ?? product.retail_price_twd?.toLocaleString()}</span>
                              {product.retail_price_twd && (
                                <span className="text-xs text-gray-400 line-through">NT$ {product.retail_price_twd.toLocaleString()}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {sortedProducts.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-2xl border border-dashed border-gray-300">
                    <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">search_off</span>
                    <p className="text-gray-500">沒有找到符合條件的商品</p>
                    <button onClick={resetAllFilters} className="mt-4 px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700">
                      清除篩選條件
                    </button>
                  </div>
                )}
               </>
             )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
