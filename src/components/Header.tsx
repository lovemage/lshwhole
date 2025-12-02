"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import CartBadge from "@/components/CartBadge";

interface Category { id: number; name: string; level: number; sort: number; icon?: string; retail_visible?: boolean; slug: string; }
interface Relation { parent_category_id: number; child_category_id: number; }
interface Tag { id: number; name: string; slug: string; sort: number; category?: string; }

export default function Header() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ email: string | null } | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Data for Mega Menu
  const [categories, setCategories] = useState<Category[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [activeCategoryIds, setActiveCategoryIds] = useState<number[]>([]);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [mobileStartShoppingOpen, setMobileStartShoppingOpen] = useState(false); // For "Start Shopping" main accordion
  const [mobileCategoryOpen, setMobileCategoryOpen] = useState<number | null>(null); // For mobile accordion L1
  const [mobileL2Open, setMobileL2Open] = useState<number | null>(null); // For mobile accordion L2

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cRes, rRes, tRes, acRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/category-relations"),
          fetch("/api/tags"),
          fetch("/api/categories/active-ids"),
        ]);
        if (cRes.ok) setCategories(await cRes.json());
        if (rRes.ok) setRelations(await rRes.json());
        if (tRes.ok) setTags(await tRes.json());
        if (acRes.ok) setActiveCategoryIds(await acRes.json());
      } catch (e) {
        console.error("Failed to fetch menu data", e);
      }
    };
    fetchData();

    const fetchUserStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user ?? null;
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
        console.error("載入登入狀態失敗", e);
      }
    };
    fetchUserStatus();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
         fetchUserStatus();
      } else if (event === 'SIGNED_OUT') {
         setCurrentUser(null);
         setWalletBalance(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/");
      setCurrentUser(null);
      setWalletBalance(null);
      setIsMobileMenuOpen(false);
    } catch (e) {
      console.error("登出失敗", e);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Hierarchy Logic
  // 計算哪些分類應該顯示（自己有商品，或者子分類有顯示）
  const visibleCategoryIds = useMemo(() => {
    const visible = new Set<number>();
    const processing = new Set<number>(); // 避免循環依賴

    const check = (id: number): boolean => {
      if (processing.has(id)) return false; // 循環檢測
      if (visible.has(id)) return true;

      // 1. 自己有商品
      if (activeCategoryIds.includes(id)) {
        visible.add(id);
        return true;
      }

      // 2. 子分類有顯示
      processing.add(id);
      const childIds = relations.filter(r => r.parent_category_id === id).map(r => r.child_category_id);
      const hasVisibleChild = childIds.some(childId => check(childId));
      processing.delete(id);

      if (hasVisibleChild) {
        visible.add(id);
        return true;
      }
      return false;
    };

    categories.forEach(c => check(c.id));
    return visible;
  }, [categories, relations, activeCategoryIds]);

  const l1Categories = useMemo(() => categories.filter(c => c.level === 1 && visibleCategoryIds.has(c.id)).sort((a, b) => a.sort - b.sort), [categories, visibleCategoryIds]);
  
  const getChildren = (parentId: number, level: number) => {
    const childIds = relations.filter(r => r.parent_category_id === parentId).map(r => r.child_category_id);
    return categories.filter(c => c.level === level && childIds.includes(c.id) && visibleCategoryIds.has(c.id)).sort((a, b) => a.sort - b.sort);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-sm shadow-sm">
      <div className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-gray-200 px-4 sm:px-6 lg:px-10 py-3">
        <div className="flex items-center gap-4 lg:gap-8">
          {/* Hamburger Menu Button (Mobile) */}
          <button
            onClick={toggleMobileMenu}
            className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 focus:outline-none"
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>

          <Link href="/" className="flex items-center gap-3 text-gray-800">
            <div className="h-8 w-auto">
              <img src="/logo/5.png" alt="LshWholesale Logo" className="h-full w-auto object-contain" />
            </div>
            <h2 className="text-gray-900 text-lg font-bold leading-tight tracking-[-0.015em]">LshWholesale</h2>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8 relative">
            <Link className="text-gray-700 hover:text-primary text-sm font-medium leading-normal transition-colors" href="/">首頁</Link>
            
            {/* Mega Menu Trigger */}
            <div 
              className="group"
              onMouseEnter={() => setIsMegaMenuOpen(true)}
              onMouseLeave={() => setIsMegaMenuOpen(false)}
            >
              <button 
                className={`text-sm font-medium leading-normal transition-colors flex items-center gap-1 ${isMegaMenuOpen ? "text-primary" : "text-gray-700 hover:text-primary"}`}
                onClick={() => router.push('/products')}
              >
                開始購物
                <span className="material-symbols-outlined text-sm">expand_more</span>
              </button>

              {/* Mega Menu Panel */}
              {isMegaMenuOpen && (
                <div className="absolute top-full left-0 w-[800px] pt-2 z-50">
                  <div className="bg-white shadow-xl border border-gray-100 rounded-xl p-6 grid grid-cols-4 gap-6">
                    {/* Categories by L1 */}
                    {l1Categories.map(l1 => (
                    <div key={l1.id} className="flex flex-col gap-2">
                      <Link href={`/products?category_id=${l1.id}`} className="font-bold text-gray-900 hover:text-primary mb-2 flex items-center gap-2">
                        {l1.icon && <span className="text-lg">{l1.icon}</span>}
                        {l1.name}
                      </Link>
                      <div className="flex flex-col gap-1 pl-2 border-l border-gray-100">
                        {getChildren(l1.id, 2).map(l2 => (
                          <div key={l2.id} className="group/l2">
                            <Link href={`/products?category_id=${l2.id}`} className="text-sm text-gray-600 hover:text-primary block py-0.5">
                              {l2.name}
                            </Link>
                            {/* L3 inside L2? Maybe just show top items or skip for clean look if too many */}
                            {/* Let's list L3 inline or small */}
                            <div className="pl-2 hidden group-hover/l2:block">
                               {getChildren(l2.id, 3).map(l3 => (
                                 <Link key={l3.id} href={`/products?category_id=${l3.id}`} className="text-xs text-gray-500 hover:text-primary block py-0.5">
                                   - {l3.name}
                                 </Link>
                               ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                    {/* Tags Column */}
                    <div className="flex flex-col gap-2">
                      <div className="font-bold text-gray-900 mb-2">熱門標籤</div>
                      <div className="flex flex-wrap gap-2">
                        {tags.map(tag => (
                          <Link key={tag.id} href={`/products?tag_id=${tag.id}`} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700 hover:bg-primary hover:text-white transition-colors">
                            {tag.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Link className="text-gray-700 hover:text-primary text-sm font-medium leading-normal transition-colors" href="/howtogo">如何運作</Link>
          </nav>
        </div>

        <div className="flex flex-1 justify-end items-center gap-2 sm:gap-4">
          <label className="hidden md:flex flex-col min-w-40 !h-10 max-w-64">
            <div className="flex w-full flex-1 items-stretch rounded-lg h-full">
              <div className="text-gray-500 flex bg-gray-100 items-center justify-center pl-3 rounded-l-lg border-r-0">
                <span className="material-symbols-outlined !text-xl">search</span>
              </div>
              <input
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 focus:outline-0 focus:ring-0 border-none bg-gray-100 focus:border-none h-full placeholder:text-gray-500 px-4 rounded-l-none border-l-0 pl-2 text-sm font-normal leading-normal"
                placeholder="搜尋"
                defaultValue=""
              />
            </div>
          </label>
          
          {/* Desktop User Actions */}
          <div className="hidden sm:flex items-center gap-3">
            {currentUser ? (
              <>
                <span className="text-sm text-gray-700">
                  儲值金：
                  <span className="font-semibold">NT$ {walletBalance ?? 0}</span>
                </span>
                <Link
                  href="/member"
                  className="flex min-w-[96px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-200 text-gray-800 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-gray-300 transition-colors"
                >
                  <span className="truncate">會員中心</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-100 text-gray-700 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-gray-200 transition-colors"
                >
                  <span className="truncate">登出</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors"
                >
                  <span className="truncate">註冊</span>
                </Link>
                <Link
                  href="/login"
                  className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-200 text-gray-800 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-gray-300 transition-colors"
                >
                  <span className="truncate">登入</span>
                </Link>
              </>
            )}
          </div>
          <div className="flex gap-2">
            {/* Heart Icon: Hidden on Mobile */}
            <button className="hidden lg:flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 bg-gray-200 text-gray-800 gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-2.5">
              <span className="material-symbols-outlined !text-xl">favorite</span>
            </button>
            <CartBadge />
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-white border-b border-gray-200 shadow-lg max-h-[calc(100vh-64px)] overflow-y-auto">
          <div className="flex flex-col p-4 space-y-4">
            {/* Search Bar (Mobile) */}
            <div className="flex w-full items-stretch rounded-lg h-10 bg-gray-100">
              <div className="text-gray-500 flex items-center justify-center pl-3">
                <span className="material-symbols-outlined !text-xl">search</span>
              </div>
              <input
                className="flex-1 bg-transparent border-none focus:ring-0 px-2 text-sm"
                placeholder="搜尋商品..."
              />
            </div>

            {/* Navigation Links */}
            <nav className="flex flex-col space-y-2">
              <Link onClick={() => setIsMobileMenuOpen(false)} className="text-gray-700 hover:text-primary font-medium py-2 border-b border-gray-100" href="/">首頁</Link>
              
              {/* Start Shopping Accordion */}
              <div className="border-b border-gray-100">
                <button 
                  className="w-full flex justify-between items-center py-2 text-gray-700 font-medium hover:text-primary"
                  onClick={() => setMobileStartShoppingOpen(!mobileStartShoppingOpen)}
                >
                  <span>開始購物</span>
                  <span className="material-symbols-outlined">{mobileStartShoppingOpen ? 'expand_less' : 'expand_more'}</span>
                </button>
                
                {/* L1 List */}
                <div className={`pl-4 flex flex-col space-y-1 overflow-hidden transition-all duration-300 ${mobileStartShoppingOpen ? 'max-h-[1000px] pb-2' : 'max-h-0'}`}>
                  {l1Categories.map(l1 => (
                    <div key={l1.id}>
                      <div className="flex justify-between items-center py-1">
                        <Link href={`/products?category_id=${l1.id}`} onClick={() => setIsMobileMenuOpen(false)} className="text-sm text-gray-800 flex items-center gap-2">
                          {l1.icon} {l1.name}
                        </Link>
                        <button onClick={(e) => { e.stopPropagation(); setMobileCategoryOpen(mobileCategoryOpen === l1.id ? null : l1.id); }} className="p-1">
                           <span className="material-symbols-outlined text-base text-gray-400">{mobileCategoryOpen === l1.id ? 'remove' : 'add'}</span>
                        </button>
                      </div>
                      
                      {/* L2 List */}
                      <div className={`transition-all duration-300 overflow-hidden ${mobileCategoryOpen === l1.id ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="pl-4 flex flex-col space-y-1 border-l-2 border-gray-100 my-1">
                          {getChildren(l1.id, 2).map(l2 => (
                            <div key={l2.id}>
                              <div className="flex justify-between items-center py-1">
                                <Link href={`/products?category_id=${l2.id}`} onClick={() => setIsMobileMenuOpen(false)} className="text-xs text-gray-600">
                                  {l2.name}
                                </Link>
                                <button onClick={(e) => { e.stopPropagation(); setMobileL2Open(mobileL2Open === l2.id ? null : l2.id); }} className="p-1">
                                  <span className="material-symbols-outlined text-sm text-gray-300">{mobileL2Open === l2.id ? 'remove' : 'add'}</span>
                                </button>
                              </div>

                              {/* L3 List */}
                              <div className={`transition-all duration-300 overflow-hidden ${mobileL2Open === l2.id ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="pl-3 flex flex-col space-y-1 pb-1">
                                  {getChildren(l2.id, 3).map(l3 => (
                                    <Link key={l3.id} href={`/products?category_id=${l3.id}`} onClick={() => setIsMobileMenuOpen(false)} className="text-xs text-gray-500 block py-0.5">
                                      - {l3.name}
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                </div>
              </div>

              <Link onClick={() => setIsMobileMenuOpen(false)} className="text-gray-700 hover:text-primary font-medium py-2 border-b border-gray-100" href="/howtogo">如何運作</Link>
            </nav>

            {/* User Actions */}
            <div className="flex flex-col space-y-3 pt-2">
              {currentUser ? (
                <>
                  <div className="flex justify-between items-center text-sm text-gray-700">
                    <span>儲值金</span>
                    <span className="font-semibold">NT$ {walletBalance ?? 0}</span>
                  </div>
                  <Link
                    href="/member"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full py-2 bg-gray-200 text-gray-800 text-center rounded-lg font-bold hover:bg-gray-300"
                  >
                    會員中心
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full py-2 bg-gray-100 text-gray-700 text-center rounded-lg font-bold hover:bg-gray-200"
                  >
                    登出
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="py-2 bg-gray-200 text-gray-800 text-center rounded-lg font-bold hover:bg-gray-300"
                  >
                    登入
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="py-2 bg-primary text-white text-center rounded-lg font-bold hover:bg-primary/90"
                  >
                    註冊
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
