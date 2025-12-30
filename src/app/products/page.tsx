"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import BannerCarousel from "@/components/BannerCarousel";
import { supabase } from "@/lib/supabase";
import { useMemberPermissions } from "@/lib/memberPermissions";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Tag { id: number; name: string; slug: string; sort: number; category?: string; }

interface RetailProduct {
  id: number;
  title: string;
  retail_price_twd: number | null;
  wholesale_price_twd: number | null;
  cover_image_url: string | null;
  tags?: Tag[];
}

interface Category { id: number; name: string; level: number; sort: number; icon?: string; retail_visible?: boolean; }
interface Relation { parent_category_id: number; child_category_id: number; }

export default function ProductsPage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: "#fffdf5" }} className="min-h-screen" />}>
      <ProductsPageInner />
    </Suspense>
  );
}

function ProductsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  // 分類與標籤
  const [categoriesAll, setCategoriesAll] = useState<Category[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  // 會員權限
  const { loading: permissionsLoading, error: permissionsError, data: permissions } = useMemberPermissions();

  const allowedCategorySet = useMemo(() => {
    const allowedL1 = permissions?.permissions.allowed_l1_category_ids;
    if (!allowedL1 || allowedL1.length === 0) return null;

    const allowed = new Set<number>();
    const adj = new Map<number, number[]>();
    relations.forEach((r) => {
      const arr = adj.get(r.parent_category_id) || [];
      arr.push(r.child_category_id);
      adj.set(r.parent_category_id, arr);
    });

    allowedL1.forEach((id) => {
      const q: number[] = [id];
      while (q.length) {
        const cur = q.shift()!;
        if (allowed.has(cur)) continue;
        allowed.add(cur);
        (adj.get(cur) || []).forEach((child) => q.push(child));
      }
    });

    return allowed;
  }, [permissions?.permissions.allowed_l1_category_ids, relations]);

  const [accessToken, setAccessToken] = useState<string | null>(null);

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

  // 分類層級
  const filteredCategories = useMemo(() => {
    if (!allowedCategorySet) return categoriesAll;
    return categoriesAll.filter((c) => allowedCategorySet.has(c.id));
  }, [allowedCategorySet, categoriesAll]);

  const filteredRelations = useMemo(() => {
    if (!allowedCategorySet) return relations;
    return relations.filter(
      (r) => allowedCategorySet.has(r.parent_category_id) && allowedCategorySet.has(r.child_category_id)
    );
  }, [allowedCategorySet, relations]);

  const l1Categories = useMemo(() => {
    return filteredCategories
      .filter((c) => c.level === 1)
      .sort((a, b) => a.sort - b.sort);
  }, [filteredCategories]);
  const l2Categories = useMemo(() => {
    return filteredCategories
      .filter((c) => c.level === 2)
      .sort((a, b) => a.sort - b.sort);
  }, [filteredCategories]);
  const l3Categories = useMemo(() => filteredCategories.filter((c) => c.level === 3).sort((a, b) => a.sort - b.sort), [filteredCategories]);

  // 選中的分類和標籤
  const [selectedL1Id, setSelectedL1Id] = useState<number | null>(null);
  const [selectedL2Id, setSelectedL2Id] = useState<number | null>(null);
  const [selectedL3Id, setSelectedL3Id] = useState<number | null>(null);
  // 多選標籤
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  // Category Accordion Expanded State
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<number>>(new Set());

  const urlSyncRef = useRef<{ lastCategoryId: number | null; ready: boolean }>({
    lastCategoryId: null,
    ready: false,
  });

  // Tag Sections Expanded State (Default: A1 expanded, others collapsed)
  const [expandedTagSections, setExpandedTagSections] = useState<Set<string>>(new Set(['A1']));
  
  // Brand Filter Letter
  const [brandLetter, setBrandLetter] = useState<string>('All');

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
    if (!permissions || permissions.tier === 'guest' || !permissions.permissions.can_view_products) {
      setProducts([]);
      setLoading(false);
      return;
    }
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
    const childIds = filteredRelations.filter(r => r.parent_category_id === parentId).map(r => r.child_category_id);
    return filteredCategories.filter(c => c.level === level && childIds.includes(c.id)).sort((a, b) => a.sort - b.sort);
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
    const raw = searchParams.get("category_id");
    const categoryId = raw ? Number(raw) : null;
    if (categoryId !== null && Number.isNaN(categoryId)) {
      urlSyncRef.current.ready = true;
      return;
    }

    if (urlSyncRef.current.lastCategoryId === categoryId && urlSyncRef.current.ready) {
      return;
    }

    // If no category_id provided, allow normal behavior.
    if (categoryId === null) {
      urlSyncRef.current.lastCategoryId = null;
      urlSyncRef.current.ready = true;
      return;
    }

    // Wait until we have enough data to resolve hierarchy AND allowedCategorySet is ready.
    if (categoriesAll.length === 0 || relations.length === 0 || !allowedCategorySet) {
      urlSyncRef.current.ready = false;
      return;
    }

    const cat = categoriesAll.find((c) => c.id === categoryId);
    if (!cat) {
      urlSyncRef.current.lastCategoryId = categoryId;
      urlSyncRef.current.ready = true;
      return;
    }

    const parentByChild = new Map<number, number[]>();
    relations.forEach((r) => {
      const arr = parentByChild.get(r.child_category_id) || [];
      arr.push(r.parent_category_id);
      parentByChild.set(r.child_category_id, arr);
    });

    const findParentOfLevel = (childId: number, targetLevel: number): number | null => {
      const q: number[] = [...(parentByChild.get(childId) || [])];
      const visited = new Set<number>();
      while (q.length) {
        const cur = q.shift()!;
        if (visited.has(cur)) continue;
        visited.add(cur);
        const curCat = categoriesAll.find((c) => c.id === cur);
        if (curCat?.level === targetLevel) return cur;
        (parentByChild.get(cur) || []).forEach((p) => q.push(p));
      }
      return null;
    };

    const l1 = cat.level === 1 ? categoryId : cat.level === 2 ? findParentOfLevel(categoryId, 1) : findParentOfLevel(categoryId, 1);
    const l2 = cat.level === 2 ? categoryId : cat.level === 3 ? findParentOfLevel(categoryId, 2) : null;
    const l3 = cat.level === 3 ? categoryId : null;

    setSelectedL1Id(l1);
    setSelectedL2Id(l2);
    setSelectedL3Id(l3);

    setExpandedCategoryIds((prev) => {
      const next = new Set(prev);
      if (l1) next.add(l1);
      if (l2) next.add(l2);
      return next;
    });

    urlSyncRef.current.lastCategoryId = categoryId;
    urlSyncRef.current.ready = true;
  }, [searchParams, categoriesAll, relations, allowedCategorySet]);

  useEffect(() => {
    if (!allowedCategorySet) return;
    if (!urlSyncRef.current.ready) return;
    const urlCategoryId = searchParams.get("category_id");
    if (urlCategoryId) return;
    if (selectedL1Id && !allowedCategorySet.has(selectedL1Id)) setSelectedL1Id(null);
    if (selectedL2Id && !allowedCategorySet.has(selectedL2Id)) setSelectedL2Id(null);
    if (selectedL3Id && !allowedCategorySet.has(selectedL3Id)) setSelectedL3Id(null);
  }, [allowedCategorySet, selectedL1Id, selectedL2Id, selectedL3Id, searchParams]);

  useEffect(() => {
    if (permissionsLoading) return;
    if (!urlSyncRef.current.ready) return;
    if (!permissions || permissions.tier === 'guest' || !permissions.permissions.can_view_products) {
      setProducts([]);
      setLoading(false);
      return;
    }
    fetchProducts({
      categoryId: getCurrentCategoryId(),
      tagIds: selectedTagIds,
      search: searchTerm.trim()
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedL1Id, selectedL2Id, selectedL3Id, selectedTagIds, permissionsLoading, permissions, searchTerm]);

  // 搜尋即時
  useEffect(() => {
    const h = setTimeout(() => {
      if (permissions && permissions.permissions.can_view_products && permissions.tier !== 'guest') {
        fetchProducts({
          categoryId: getCurrentCategoryId(),
          tagIds: selectedTagIds,
          search: searchTerm.trim()
        });
      }
    }, 250);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, permissions]);

  const sortedProducts = useMemo(() => {
    const arr = [...products];
    if (sortBy === "price-low") return arr.sort((a,b)=>(a.retail_price_twd||0)-(b.retail_price_twd||0));
    if (sortBy === "price-high") return arr.sort((a,b)=>(b.retail_price_twd||0)-(a.retail_price_twd||0));
    return arr; // newest 由 API 按 created_at desc
  }, [products, sortBy]);

  const toggleTagSection = (code: string) => {
    setExpandedTagSections(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const renderTagSection = (title: string, categoryCode: string, colorClass: string, icon?: string) => {
    // categoryCode: 'A1', 'A2', 'A3'
    // For A2, we handle null or 'A2' in the filter logic below, but we use 'A2' as key
    
    const filteredTags = tags.filter(t => 
      categoryCode === "A2" 
        ? (!t.category || t.category === "A2") 
        : t.category === categoryCode
    ).sort((a, b) => a.sort - b.sort);

    if (filteredTags.length === 0) return null;

    const isExpanded = expandedTagSections.has(categoryCode);
    const isBrandSection = categoryCode === 'A1';

    // Grouping logic for Brands (A1)
    let displayTags = filteredTags;
    let alphabet: string[] = [];

    if (isBrandSection) {
        // Extract unique first letters
        const letters = new Set<string>();
        filteredTags.forEach(t => {
            const first = t.name.charAt(0).toUpperCase();
            // Check if it is a letter
            if (/[A-Z]/.test(first)) {
                letters.add(first);
            } else {
                letters.add('#');
            }
        });
        alphabet = Array.from(letters).sort((a, b) => {
             if (a === '#') return 1;
             if (b === '#') return -1;
             return a.localeCompare(b);
        });

        // Filter based on selected letter
        if (brandLetter !== 'All') {
            displayTags = filteredTags.filter(t => {
                const first = t.name.charAt(0).toUpperCase();
                if (brandLetter === '#') {
                    return !/[A-Z]/.test(first);
                }
                return first === brandLetter;
            });
        }
    }

    return (
      <div className="mb-4 last:mb-0 border border-gray-100 rounded-2xl overflow-hidden bg-white">
        <button 
          onClick={() => toggleTagSection(categoryCode)}
          className="w-full flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors"
        >
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              {icon && <span className="material-symbols-outlined text-primary">{icon}</span>}
              {title}
          </h3>
          <span className={`material-symbols-outlined text-gray-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
            expand_more
          </span>
        </button>
        
        <div className={`transition-all duration-300 ease-in-out ${isExpanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="p-4 pt-0">
             {isBrandSection && (
                 <div className="mb-4 flex flex-wrap gap-1 border-b border-gray-100 pb-3">
                     <button
                        onClick={() => setBrandLetter('All')}
                        className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${
                            brandLetter === 'All' 
                            ? 'bg-gray-800 text-white' 
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                     >
                        ALL
                     </button>
                     {alphabet.map(letter => (
                         <button
                            key={letter}
                            onClick={() => setBrandLetter(letter)}
                            className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded-md transition-colors ${
                                brandLetter === letter
                                ? 'bg-primary text-white'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                         >
                            {letter}
                         </button>
                     ))}
                 </div>
             )}
             
             <div className={`${isBrandSection ? "max-h-[400px] overflow-y-auto pr-1 custom-scrollbar" : ""} flex flex-wrap gap-2`}>
                {displayTags.map(tag => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                    <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 transform active:scale-95 ${
                        isSelected
                        ? `${colorClass} text-white shadow-md shadow-primary/30 ring-2 ring-white`
                        : "bg-white text-gray-600 border border-gray-100 hover:border-primary/30 hover:shadow-sm"
                    }`}
                    >
                    {tag.name}
                    </button>
                );
                })}
                {displayTags.length === 0 && (
                    <p className="text-sm text-gray-400 w-full text-center py-4">沒有相關標籤</p>
                )}
             </div>
          </div>
        </div>
      </div>
    );
  };

  const cannotViewProducts = !permissionsLoading && (!permissions || permissions.tier === 'guest' || !permissions.permissions.can_view_products);

  useEffect(() => {
    if (cannotViewProducts) {
      router.replace(`/login?next=${encodeURIComponent('/products')}`);
    }
  }, [cannotViewProducts, router]);

  if (cannotViewProducts) {
    return (
      <div style={{ backgroundColor: "#fffdf5" }} className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden font-sans">
        <Header />
        <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
            <h1 className="text-2xl font-bold text-gray-900">登入或註冊後即可瀏覽全部商品</h1>
            <p className="text-gray-600">目前訪客僅能在首頁查看精選商品，請先加入會員以瀏覽完整商品列表。</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register" className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90">註冊會員</Link>
              <Link href="/login" className="px-6 py-3 bg-gray-100 text-gray-800 rounded-xl font-bold hover:bg-gray-200">已是會員？登入</Link>
              <Link href="/" className="px-6 py-3 text-primary font-bold">返回首頁</Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#fffdf5" }} className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden font-sans">
      <Header />

      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner - Full Width with rounded corners */}
        <section className="mb-10 px-0 sm:px-2">
          <div className="rounded-[2.5rem] overflow-hidden shadow-lg shadow-yellow-500/10 border-4 border-white ring-1 ring-gray-100 transform hover:scale-[1.005] transition-transform duration-500">
             <BannerCarousel
                type="products"
                className="w-full h-[250px] sm:h-[350px] md:h-[450px]"
             />
          </div>
        </section>

        <div className="flex flex-col lg:flex-row gap-8 xl:gap-12">
          {/* Left Sidebar - Cute Style */}
          <aside className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-6">
            {/* Mobile Search */}
            <div className="lg:hidden">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                  <input
                    type="text"
                    placeholder="搜尋可愛商品..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white border-2 border-gray-100 rounded-2xl shadow-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-gray-700 placeholder-gray-400"
                  />
                </div>
            </div>
            
            {/* Tags Filter Card */}
            <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-gray-100/50">
               {renderTagSection("品牌專區", "A1", "bg-primary", "verified")}
               {renderTagSection("商品屬性", "A2", "bg-[#4ECDC4]", "category")}
               {renderTagSection("限時活動", "A3", "bg-[#FF6B6B]", "local_fire_department")}
            </div>

            {/* Categories Accordion Card - Hidden on Mobile */}
            <div className="hidden lg:block bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100/50">
              <div className="flex justify-between items-center mb-6 px-2">
                <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">widgets</span>
                    分類瀏覽
                </h3>
                {(selectedL1Id || selectedTagIds.length > 0) && (
                  <button onClick={resetAllFilters} className="text-xs text-gray-400 hover:text-primary transition-colors flex items-center gap-1 bg-gray-50 px-3 py-1 rounded-full">
                    <span className="material-symbols-outlined text-[14px]">refresh</span>
                    重置
                  </button>
                )}
              </div>
              
              <div className="space-y-2">
                {l1Categories.map(l1 => {
                   const isL1Expanded = expandedCategoryIds.has(l1.id);
                   const isL1Selected = selectedL1Id === l1.id;
                   
                   return (
                     <div key={l1.id} className="select-none">
                       {/* L1 Item */}
                       <div 
                         onClick={() => handleL1Click(l1.id)}
                         className={`group flex items-center justify-between px-4 py-3 rounded-2xl cursor-pointer transition-all duration-300 ${
                           isL1Selected 
                             ? "bg-primary text-white shadow-lg shadow-primary/30 transform scale-[1.02]" 
                             : "text-gray-600 hover:bg-gray-50 hover:text-primary"
                         }`}
                       >
                         <div className="flex items-center gap-3">
                           <span className="text-xl">{l1.icon}</span>
                           <span className="font-bold">{l1.name}</span>
                         </div>
                         <span className={`material-symbols-outlined text-sm transition-transform duration-300 ${isL1Expanded ? "rotate-180" : ""} ${isL1Selected ? "text-white" : "text-gray-300 group-hover:text-primary"}`}>
                           expand_more
                         </span>
                       </div>

                       {/* L2 List */}
                       <div className={`grid transition-all duration-300 ease-in-out ${isL1Expanded ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0"}`}>
                         <div className="overflow-hidden">
                           <div className="bg-gray-50/50 rounded-2xl p-2 space-y-1">
                             {getChildren(l1.id, 2).map(l2 => {
                               const isL2Expanded = expandedCategoryIds.has(l2.id);
                               const isL2Selected = selectedL2Id === l2.id;
                               
                               return (
                                 <div key={l2.id}>
                                   <div 
                                     onClick={(e) => { e.stopPropagation(); handleL2Click(l2.id); }}
                                     className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                                       isL2Selected ? "text-primary font-bold bg-white shadow-sm" : "text-gray-500 hover:text-gray-800 hover:bg-white/60"
                                     }`}
                                   >
                                     <span className="text-sm font-medium">{l2.name}</span>
                                     {getChildren(l2.id, 3).length > 0 && (
                                       <span className={`material-symbols-outlined text-xs text-gray-300 transition-transform ${isL2Expanded ? "rotate-180" : ""}`}>
                                         expand_more
                                       </span>
                                     )}
                                   </div>

                                   {/* L3 List */}
                                   {isL2Expanded && (
                                     <div className="pl-4 pr-1 py-1 space-y-1">
                                        {getChildren(l2.id, 3).map(l3 => {
                                          const isL3Selected = selectedL3Id === l3.id;
                                          return (
                                            <div
                                              key={l3.id}
                                              onClick={(e) => { e.stopPropagation(); handleL3Click(l3.id); }}
                                              className={`px-3 py-1.5 rounded-lg cursor-pointer text-xs font-medium transition-all ${
                                                isL3Selected ? "text-primary bg-primary/5 border border-primary/20" : "text-gray-400 hover:text-gray-700"
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
                         </div>
                       </div>
                     </div>
                   );
                })}
              </div>
            </div>
          </aside>

          {/* Right Content - Search & Grid */}
          <div className="flex-1 min-w-0">
             {/* Top Bar: Search & Sort */}
             <div className="flex flex-col sm:flex-row gap-4 mb-8 sticky top-20 z-10 py-3 px-1">
                <div className="absolute inset-0 bg-[#fffdf5]/90 backdrop-blur-md -z-10 rounded-2xl"></div>
                
                <div className="flex-1 relative hidden lg:block">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                  <input
                    type="text"
                    placeholder="搜尋可愛商品..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white border-2 border-transparent hover:border-gray-100 focus:border-primary rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-gray-700"
                  />
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto ml-auto">
                  <span className="text-sm font-medium text-gray-500 whitespace-nowrap bg-white px-4 py-2 rounded-full shadow-sm">{products.length} 個寶藏</span>
                  <div className="relative group">
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="appearance-none pl-5 pr-10 py-3 bg-white border-2 border-transparent hover:border-gray-100 rounded-2xl shadow-sm text-sm font-bold text-gray-700 focus:outline-none focus:border-primary cursor-pointer transition-all"
                    >
                        <option value="newest">✨ 最新上架</option>
                        <option value="price-low">💰 價格：低到高</option>
                        <option value="price-high">💎 價格：高到低</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-primary transition-colors">
                        sort
                    </span>
                  </div>
                </div>
             </div>

             {/* Selected Filters Chips */}
             {(selectedTagIds.length > 0 || selectedL1Id) && (
                <div className="flex flex-wrap gap-2 mb-6 animate-fade-in">
                  {selectedL1Id && (
                     <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-white border border-gray-100 text-sm font-bold text-gray-700 shadow-sm">
                        {l1Categories.find(c => c.id === selectedL1Id)?.name}
                        {selectedL2Id && ` > ${l2Categories.find(c => c.id === selectedL2Id)?.name}`}
                        {selectedL3Id && ` > ${l3Categories.find(c => c.id === selectedL3Id)?.name}`}
                        <button onClick={() => setSelectedL1Id(null)} className="ml-2 w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-500 hover:text-white transition-colors">×</button>
                     </span>
                  )}
                  {selectedTagIds.map(tid => {
                    const t = tags.find(tag => tag.id === tid);
                    if (!t) return null;
                    return (
                      <span key={tid} className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary text-white text-sm font-bold shadow-sm shadow-primary/20">
                        {t.name}
                        <button onClick={() => toggleTag(tid)} className="ml-2 w-5 h-5 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 transition-colors">×</button>
                      </span>
                    );
                  })}
                  <button onClick={resetAllFilters} className="text-sm font-medium text-gray-400 hover:text-gray-600 px-3 py-1.5 transition-colors">
                    清除全部
                  </button>
                </div>
             )}
             
             {/* Product Grid - 5 Columns for PC, 2 Columns for Mobile */}
             {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="bg-white rounded-3xl aspect-[3/4] animate-pulse"></div>
                  ))}
                </div>
             ) : (
               <>
                 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
                  {sortedProducts.map((product) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.id}`}
                      className="group flex flex-col bg-white rounded-[1.5rem] sm:rounded-[2rem] p-3 hover:shadow-[0_15px_30px_-5px_rgba(0,0,0,0.05)] transition-all duration-300 border border-transparent hover:border-primary/20 hover:-translate-y-1.5"
                    >
                      <div className="aspect-square w-full overflow-hidden rounded-2xl bg-gray-50 relative mb-3">
                        <img
                          src={product.cover_image_url || "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1200&auto=format&fit=crop"}
                          alt={product.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        {/* Quick View Button (Desktop) */}
                        <div className="absolute bottom-3 right-3 translate-y-10 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                           <div className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors">
                              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                           </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col grow px-1">
                        {/* Tags: Brand (A1) & Promo (A3) & Attribute (A2) */}
                        <div className="flex flex-wrap gap-1.5 mb-2">
                           {/* Brand - Yellow */}
                           {product.tags?.filter(t => t.category === 'A1').slice(0, 1).map(t => (
                              <span key={t.id} className="inline-block px-2 py-0.5 rounded-md bg-[#FFF8E1] text-[#F59E0B] text-[10px] font-bold border border-[#F59E0B]/10">
                                {t.name}
                              </span>
                           ))}
                           {/* Promo - Red */}
                           {product.tags?.filter(t => t.category === 'A3').slice(0, 1).map(t => (
                              <span key={t.id} className="inline-block px-2 py-0.5 rounded-md bg-[#FFEBEE] text-[#EF5350] text-[10px] font-bold border border-[#EF5350]/10">
                                {t.name}
                              </span>
                           ))}
                           {/* Attribute - Blue/Teal (Only show if no promo or brand to save space, or just max 2 tags) */}
                           {product.tags?.filter(t => !t.category || t.category === 'A2').slice(0, 1).map(t => (
                              <span key={t.id} className="inline-block px-2 py-0.5 rounded-md bg-[#E0F2F1] text-[#26A69A] text-[10px] font-bold border border-[#26A69A]/10">
                                {t.name}
                              </span>
                           ))}
                        </div>

                        <h3 className="text-[15px] text-gray-700 leading-snug grow line-clamp-2 font-bold mb-2 group-hover:text-primary transition-colors tracking-tight">
                          {product.title}
                        </h3>
                        
                        <div className="mt-auto flex items-end justify-between border-t border-gray-50 pt-3">
                          <div className="flex flex-col">
                            {permissions?.permissions.price_type === 'none' && (
                                <p className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-1 rounded-md">會員專屬價格</p>
                            )}
                            {permissions?.permissions.price_type === 'retail' && (
                                <div className="flex items-baseline gap-1">
                                <span className="text-lg font-black text-gray-800 tracking-tight">NT$ {product.retail_price_twd?.toLocaleString()}</span>
                                </div>
                            )}
                            {permissions?.permissions.price_type === 'wholesale' && (
                                <div className="flex flex-col">
                                <span className="text-lg font-black text-primary tracking-tight">NT$ {product.wholesale_price_twd?.toLocaleString() ?? product.retail_price_twd?.toLocaleString()}</span>
                                {product.retail_price_twd && (
                                    <span className="text-xs text-gray-300 line-through decoration-gray-300">NT$ {product.retail_price_twd.toLocaleString()}</span>
                                )}
                                </div>
                            )}
                          </div>
                          
                          {/* Cart Icon */}
                          <button className="w-8 h-8 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-primary hover:text-white transition-colors group-hover:scale-110">
                             <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
                          </button>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {sortedProducts.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border-4 border-dashed border-gray-100">
                    <div className="w-24 h-24 bg-yellow-50 rounded-full flex items-center justify-center mb-6">
                        <span className="material-symbols-outlined text-5xl text-yellow-300">sentiment_dissatisfied</span>
                    </div>
                    <p className="text-gray-500 font-bold text-lg mb-2">哎呀！找不到相關寶藏</p>
                    <p className="text-gray-400 text-sm mb-8">試試看其他關鍵字或分類吧？</p>
                    <button onClick={resetAllFilters} className="px-8 py-3 bg-primary text-white font-bold rounded-full hover:shadow-lg hover:shadow-primary/30 transition-all hover:-translate-y-1">
                      顯示所有商品
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
