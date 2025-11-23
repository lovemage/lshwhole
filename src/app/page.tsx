"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BannerCarousel from "@/components/BannerCarousel";
import { supabase } from "@/lib/supabase";
import CartBadge from "@/components/CartBadge";

interface Announcement {
  id: number;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
}

export default function HomePage() {

  interface RetailProduct {
    id: number;
    title: string;
    retail_price_twd: number | null;
    cover_image_url: string | null;
  }

  const router = useRouter();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAnnouncements, setShowAnnouncements] = useState(true);

  const [bestsellers, setBestsellers] = useState<RetailProduct[]>([]);
  const [bsLoading, setBsLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState<{ email: string | null } | null>(null);
  const [userTier, setUserTier] = useState<string>("guest");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const [displayProducts, setDisplayProducts] = useState<{
    popular: any[];
    korea: any[];
    japan: any[];
    thailand: any[];
  }>({ popular: [], korea: [], japan: [], thailand: [] });

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await fetch("/api/announcements");
        if (response.ok) {
          const data = await response.json();

          setAnnouncements(data);
        }
      } catch (error) {
        console.error("Failed to fetch announcements:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  useEffect(() => {
    const fetchBestsellers = async () => {
      try {
        // 改為讀取 Admin 設定的熱銷商品
        const res = await fetch("/api/hot-products");
        if (res.ok) {
          const json = await res.json();
          // API 回傳 { products: [...] }
          setBestsellers(json.products || []);
        }
      } catch (e) {
        console.error("Failed to fetch hot products:", e);
      } finally {
        setBsLoading(false);
      }
    };
    fetchBestsellers();
  }, []);

  // Fetch Display Settings and Products
  useEffect(() => {
    const fetchDisplayData = async () => {
      try {
        // 1. Fetch settings
        const settingsRes = await fetch("/api/display-settings");
        if (!settingsRes.ok) return;
        const settings = await settingsRes.json();

        // 2. Collect all IDs
        const allIds = new Set<number>([
          ...(settings.popular || []),
          ...(settings.korea || []),
          ...(settings.japan || []),
          ...(settings.thailand || [])
        ]);

        if (allIds.size === 0) return;

        // 3. Fetch products
        const productsRes = await fetch(`/api/products?ids=${Array.from(allIds).join(",")}&limit=100`);
        if (!productsRes.ok) return;
        const productsJson = await productsRes.json();
        const productsMap = new Map(productsJson.data.map((p: any) => [p.id, p]));

        // 4. Map back to categories
        setDisplayProducts({
          popular: (settings.popular || []).map((id: number) => productsMap.get(id)).filter(Boolean),
          korea: (settings.korea || []).map((id: number) => productsMap.get(id)).filter(Boolean),
          japan: (settings.japan || []).map((id: number) => productsMap.get(id)).filter(Boolean),
          thailand: (settings.thailand || []).map((id: number) => productsMap.get(id)).filter(Boolean),
        });

      } catch (e) {
        console.error("Failed to fetch display data:", e);
      }
    };
    fetchDisplayData();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user ?? null;
        if (user) {
          setCurrentUser({ email: user.email ?? null });

          // Fetch Profile for Tier
          const { data: profileData } = await supabase
            .from("profiles")
            .select("tier")
            .eq("user_id", user.id)
            .single();

          if (profileData) {
            setUserTier(profileData.tier || "guest");
          }

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
          setUserTier("guest");
          setWalletBalance(null);
        }
      } catch (e) {
        console.error("載入登入狀態失敗（首頁）", e);
      }
    })();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("登出失敗", e);
    } finally {
      router.push("/");
    }
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden" style={{ backgroundColor: '#f8f8f5' }}>
      <div className="layout-container flex h-full grow flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-gray-200 px-4 sm:px-6 lg:px-10 py-3">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-3 text-gray-800">
                <div className="size-6 text-primary">
                  <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path d="M44 11.2727C44 14.0109 39.8386 16.3957 33.69 17.6364C39.8386 18.877 44 21.2618 44 24C44 26.7382 39.8386 29.123 33.69 30.3636C39.8386 31.6043 44 33.9891 44 36.7273C44 40.7439 35.0457 44 24 44C12.9543 44 4 40.7439 4 36.7273C4 33.9891 8.16144 31.6043 14.31 30.3636C8.16144 29.123 4 26.7382 4 24C4 21.2618 8.16144 18.877 14.31 17.6364C8.16144 16.3957 4 14.0109 4 11.2727C4 7.25611 12.9543 4 24 4C35.0457 4 44 7.25611 44 11.2727Z" fill="currentColor"></path>
                  </svg>
                </div>
                <h2 className="text-gray-900 text-lg font-bold leading-tight tracking-[-0.015em]">Lsx wholesale</h2>
              </Link>
              <nav className="hidden lg:flex items-center gap-8">
                <Link className="text-gray-700 hover:text-primary text-sm font-medium leading-normal transition-colors" href="/">首頁</Link>
                <Link className="text-gray-700 hover:text-primary text-sm font-medium leading-normal transition-colors" href="/products">商品</Link>
                <Link className="text-gray-700 hover:text-primary text-sm font-medium leading-normal transition-colors" href="/products">韓國</Link>
                <Link className="text-gray-700 hover:text-primary text-sm font-medium leading-normal transition-colors" href="/products">日本</Link>
                <Link className="text-gray-700 hover:text-primary text-sm font-medium leading-normal transition-colors" href="/products">泰國</Link>
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
                <button className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 bg-gray-200 text-gray-800 gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-2.5">
                  <span className="material-symbols-outlined !text-xl">favorite</span>
                </button>
                <CartBadge />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1">
          {/* Announcements Section */}
          {!loading && announcements.length > 0 && showAnnouncements && (
            <div className="px-4 sm:px-6 lg:px-10 py-6 bg-white border-b border-gray-200">
              <div className="layout-content-container flex flex-col max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-gray-900 text-lg font-bold leading-tight tracking-[-0.015em]">公告事項</h2>
                  <button
                    onClick={() => setShowAnnouncements(false)}
                    className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="關閉公告"
                  >
                    <span className="material-symbols-outlined text-gray-500 text-xl">close</span>
                  </button>
                </div>

                {/* 桌面版：水平滾動 */}
                <div className="hidden sm:block">
                  <div className="flex overflow-x-auto [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-4">
                    <div className="flex items-stretch p-4 gap-4">
                      {announcements.map((announcement) => (
                        <div
                          key={announcement.id}
                          className="flex flex-col gap-3 rounded-xl bg-blue-50 border border-blue-200 p-4 min-w-80 flex-shrink-0"
                        >
                          <h3 className="text-gray-900 text-base font-bold leading-tight">{announcement.title}</h3>
                          <p className="text-gray-700 text-sm font-normal leading-normal line-clamp-2">
                            {announcement.content.replace(/<[^>]*>/g, "")}
                          </p>
                          <a href="#" className="text-primary hover:underline text-sm font-semibold">
                            查看詳情
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 移動版：垂直堆疊 */}
                <div className="block sm:hidden">
                  <div className="flex flex-col gap-4">
                    {announcements.map((announcement) => (
                      <div
                        key={announcement.id}
                        className="flex flex-col gap-3 rounded-xl bg-blue-50 border border-blue-200 p-4"
                      >
                        <h3 className="text-gray-900 text-base font-bold leading-tight">{announcement.title}</h3>
                        <p className="text-gray-700 text-sm font-normal leading-normal line-clamp-3">
                          {announcement.content.replace(/<[^>]*>/g, "")}
                        </p>
                        <a href="#" className="text-primary hover:underline text-sm font-semibold">
                          查看詳情
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Hero Banner */}
          <div className="px-4 sm:px-6 lg:px-10 py-8">
            <div className="layout-content-container flex flex-col max-w-7xl mx-auto flex-1 gap-8">
              <section>
                <BannerCarousel
                  type="index"
                  className="min-h-[480px] lg:min-h-[560px] rounded-xl"
                />
              </section>

              {/* Feature cards */}
              <section className="flex flex-wrap gap-4 p-0">
                <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-xl p-6 border border-gray-200 bg-white">
                  <p className="text-gray-700 text-base font-medium leading-normal">批量折扣</p>
                  <p className="text-gray-900 tracking-light text-2xl font-bold leading-tight">競爭力價格</p>
                </div>
                <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-xl p-6 border border-gray-200 bg-white">
                  <p className="text-gray-700 text-base font-medium leading-normal">全球運送</p>
                  <p className="text-gray-900 tracking-light text-2xl font-bold leading-tight">快速可靠</p>
                </div>
                <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-xl p-6 border border-gray-200 bg-white">
                  <p className="text-gray-700 text-base font-medium leading-normal">品質檢驗</p>
                  <p className="text-gray-900 tracking-light text-2xl font-bold leading-tight">嚴選供應商</p>
                </div>
              </section>


              {/* Hot-Selling Products */}
              <section>
                <div className="flex justify-between items-center px-0 pb-3 pt-5">
                  <h2 className="text-gray-900 text-[22px] font-bold leading-tight tracking-[-0.015em]">熱銷商品</h2>
                  <Link className="text-primary hover:underline text-sm font-semibold" href="/hot-products">查看全部</Link>
                </div>
                <div className="flex overflow-x-auto [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-4">
                  <div className="flex items-stretch p-4 gap-4">
                    {bsLoading && Array.from({ length: 5 }).map((_, idx) => (
                      <div key={`bs-skel-${idx}`} className="flex h-full flex-1 flex-col gap-4 rounded-xl bg-white shadow-sm border border-gray-200 min-w-60 overflow-hidden">
                        <div className="w-full bg-gray-100 aspect-square animate-pulse" />
                        <div className="p-4 pt-0">
                          <div className="h-5 bg-gray-100 rounded w-4/5 mb-2" />
                          <div className="h-6 bg-gray-100 rounded w-2/5" />
                        </div>
                      </div>
                    ))}

                    {!bsLoading && bestsellers.map((product) => (
                      <div key={product.id} className="flex h-full flex-1 flex-col gap-4 rounded-xl bg-white shadow-sm border border-gray-200 min-w-60 overflow-hidden">
                        <div
                          className="w-full bg-center bg-no-repeat aspect-square bg-cover"
                          style={{ backgroundImage: `url("${product.cover_image_url || 'https://via.placeholder.com/300'}")` }}
                        />
                        <div className="flex flex-col flex-1 justify-between p-4 pt-0 gap-4">
                          <div>
                            <p className="text-gray-800 text-base font-medium leading-normal line-clamp-2">{product.title}</p>
                            <p className="text-primary text-lg font-bold leading-normal">{product.retail_price_twd ? `NT$ ${product.retail_price_twd}` : '價格待定'}</p>
                          </div>
                          <Link href={`/products/${product.id}`} className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors">
                            <span className="truncate">立即購買</span>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Popular Products Carousel */}
              <section>
                <div className="flex justify-between items-center px-0 pb-3 pt-5">
                  <h2 className="text-gray-900 text-[22px] font-bold leading-tight tracking-[-0.015em]">人氣商品</h2>
                  <a className="text-primary hover:underline text-sm font-semibold" href="#">查看全部</a>
                </div>
                <div className="flex overflow-x-auto [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-4">
                  <div className="flex items-stretch p-4 gap-4">
                    {displayProducts.popular.length === 0 ? (
                      <div className="p-4 text-gray-500">尚無人氣商品</div>
                    ) : (
                      displayProducts.popular.map((product) => (
                        <div key={product.id} className="flex h-full flex-1 flex-col gap-4 rounded-xl bg-white shadow-sm border border-gray-200 min-w-60 overflow-hidden">
                          <div
                            className="w-full bg-center bg-no-repeat aspect-square bg-cover"
                            style={{
                              backgroundImage: `url("${product.cover_image_url || 'https://via.placeholder.com/300'}")`,
                            }}
                          />
                          <div className="flex flex-col flex-1 justify-between p-4 pt-0 gap-4">
                            <div>
                              <p className="text-gray-800 text-base font-medium leading-normal line-clamp-2">{product.title_zh || product.title_original}</p>
                              <p className="text-gray-500 text-sm font-normal leading-normal">{product.sku}</p>
                              {userTier !== "guest" && (
                                <p className="text-primary text-lg font-bold leading-normal mt-1">
                                  {(userTier === "wholesale" || userTier === "vip")
                                    ? (product.wholesale_price_twd ? `NT$ ${product.wholesale_price_twd}` : `NT$ ${product.retail_price_twd}`)
                                    : (product.retail_price_twd ? `NT$ ${product.retail_price_twd}` : '價格待定')}
                                </p>
                              )}
                            </div>
                            <Link href={`/products/${product.id}`} className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-100 text-gray-800 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-gray-200 transition-colors">
                              <span className="truncate">查看詳情</span>
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>

              {/* Korea Carousel */}
              <section>
                <div className="flex justify-between items-center px-0 pb-3 pt-5">
                  <h2 className="text-gray-900 text-[22px] font-bold leading-tight tracking-[-0.015em]">韓國熱銷商品</h2>
                  <a className="text-primary hover:underline text-sm font-semibold" href="#">查看全部</a>
                </div>
                <div className="flex overflow-x-auto [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-4">
                  <div className="flex items-stretch p-4 gap-4">
                    {displayProducts.korea.length === 0 ? (
                      <div className="p-4 text-gray-500">尚無韓國熱銷商品</div>
                    ) : (
                      displayProducts.korea.map((product) => (
                        <div key={product.id} className="flex h-full flex-1 flex-col gap-4 rounded-xl bg-white shadow-sm border border-gray-200 min-w-60 overflow-hidden">
                          <div
                            className="w-full bg-center bg-no-repeat aspect-square bg-cover"
                            style={{
                              backgroundImage: `url("${product.cover_image_url || 'https://via.placeholder.com/300'}")`,
                            }}
                          />
                          <div className="flex flex-col flex-1 justify-between p-4 pt-0 gap-4">
                            <div>
                              <p className="text-gray-800 text-base font-medium leading-normal line-clamp-2">{product.title_zh || product.title_original}</p>
                              <p className="text-gray-500 text-sm font-normal leading-normal">{product.sku}</p>
                              {userTier !== "guest" && (
                                <p className="text-primary text-lg font-bold leading-normal mt-1">
                                  {(userTier === "wholesale" || userTier === "vip")
                                    ? (product.wholesale_price_twd ? `NT$ ${product.wholesale_price_twd}` : `NT$ ${product.retail_price_twd}`)
                                    : (product.retail_price_twd ? `NT$ ${product.retail_price_twd}` : '價格待定')}
                                </p>
                              )}
                            </div>
                            <Link href={`/products/${product.id}`} className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-100 text-gray-800 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-gray-200 transition-colors">
                              <span className="truncate">查看詳情</span>
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>

              {/* Japan Carousel */}
              <section>
                <div className="flex justify-between items-center px-0 pb-3 pt-5">
                  <h2 className="text-gray-900 text-[22px] font-bold leading-tight tracking-[-0.015em]">日本發現商品</h2>
                  <a className="text-primary hover:underline text-sm font-semibold" href="#">查看全部</a>
                </div>
                <div className="flex overflow-x-auto [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-4">
                  <div className="flex items-stretch p-4 gap-4">
                    {displayProducts.japan.length === 0 ? (
                      <div className="p-4 text-gray-500">尚無日本熱銷商品</div>
                    ) : (
                      displayProducts.japan.map((product) => (
                        <div key={product.id} className="flex h-full flex-1 flex-col gap-4 rounded-xl bg-white shadow-sm border border-gray-200 min-w-60 overflow-hidden">
                          <div
                            className="w-full bg-center bg-no-repeat aspect-square bg-cover"
                            style={{
                              backgroundImage: `url("${product.cover_image_url || 'https://via.placeholder.com/300'}")`,
                            }}
                          />
                          <div className="flex flex-col flex-1 justify-between p-4 pt-0 gap-4">
                            <div>
                              <p className="text-gray-800 text-base font-medium leading-normal line-clamp-2">{product.title_zh || product.title_original}</p>
                              <p className="text-gray-500 text-sm font-normal leading-normal">{product.sku}</p>
                              {userTier !== "guest" && (
                                <p className="text-primary text-lg font-bold leading-normal mt-1">
                                  {(userTier === "wholesale" || userTier === "vip")
                                    ? (product.wholesale_price_twd ? `NT$ ${product.wholesale_price_twd}` : `NT$ ${product.retail_price_twd}`)
                                    : (product.retail_price_twd ? `NT$ ${product.retail_price_twd}` : '價格待定')}
                                </p>
                              )}
                            </div>
                            <Link href={`/products/${product.id}`} className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-100 text-gray-800 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-gray-200 transition-colors">
                              <span className="truncate">查看詳情</span>
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>

              {/* Thailand Carousel */}
              <section>
                <div className="flex justify-between items-center px-0 pb-3 pt-5">
                  <h2 className="text-gray-900 text-[22px] font-bold leading-tight tracking-[-0.015em]">泰國趨勢商品</h2>
                  <a className="text-primary hover:underline text-sm font-semibold" href="#">查看全部</a>
                </div>
                <div className="flex overflow-x-auto [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-4">
                  <div className="flex items-stretch p-4 gap-4">
                    {displayProducts.thailand.length === 0 ? (
                      <div className="p-4 text-gray-500">尚無泰國趨勢商品</div>
                    ) : (
                      displayProducts.thailand.map((product) => (
                        <div key={product.id} className="flex h-full flex-1 flex-col gap-4 rounded-xl bg-white shadow-sm border border-gray-200 min-w-60 overflow-hidden">
                          <div
                            className="w-full bg-center bg-no-repeat aspect-square bg-cover"
                            style={{
                              backgroundImage: `url("${product.cover_image_url || 'https://via.placeholder.com/300'}")`,
                            }}
                          />
                          <div className="flex flex-col flex-1 justify-between p-4 pt-0 gap-4">
                            <div>
                              <p className="text-gray-800 text-base font-medium leading-normal line-clamp-2">{product.title_zh || product.title_original}</p>
                              <p className="text-gray-500 text-sm font-normal leading-normal">{product.sku}</p>
                              {userTier !== "guest" && (
                                <p className="text-primary text-lg font-bold leading-normal mt-1">
                                  {(userTier === "wholesale" || userTier === "vip")
                                    ? (product.wholesale_price_twd ? `NT$ ${product.wholesale_price_twd}` : `NT$ ${product.retail_price_twd}`)
                                    : (product.retail_price_twd ? `NT$ ${product.retail_price_twd}` : '價格待定')}
                                </p>
                              )}
                            </div>
                            <Link href={`/products/${product.id}`} className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-100 text-gray-800 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-gray-200 transition-colors">
                              <span className="truncate">查看詳情</span>
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-12">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase">網站導航</h3>
                <ul className="space-y-2">
                  <li><a className="text-base text-gray-600 hover:text-primary" href="#">商品</a></li>
                  <li><a className="text-base text-gray-600 hover:text-primary" href="#">韓國</a></li>
                  <li><a className="text-base text-gray-600 hover:text-primary" href="#">日本</a></li>
                  <li><a className="text-base text-gray-600 hover:text-primary" href="#">泰國</a></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase">客戶服務</h3>
                <ul className="space-y-2">
                  <li><a className="text-base text-gray-600 hover:text-primary" href="#">聯絡我們</a></li>
                  <li><a className="text-base text-gray-600 hover:text-primary" href="#">常見問題</a></li>
                  <li><a className="text-base text-gray-600 hover:text-primary" href="#">運送資訊</a></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase">法律</h3>
                <ul className="space-y-2">
                  <li><Link className="text-base text-gray-600 hover:text-primary" href="/terms-of-service">服務條款</Link></li>
                  <li><Link className="text-base text-gray-600 hover:text-primary" href="/privacy-policy">隱私政策</Link></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase">電子報</h3>
                <p className="text-base text-gray-600">獲取最新的產品更新和即將推出的銷售資訊。</p>
                <form className="flex flex-col sm:flex-row gap-2">
                  <input className="form-input flex-1 w-full min-w-0 rounded-lg text-gray-900 bg-gray-100 border-gray-300 focus:ring-primary focus:border-primary" placeholder="輸入您的電子郵件" type="email" />
                  <button className="flex items-center justify-center rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold" type="submit">訂閱</button>
                </form>
              </div>
            </div>
            <div className="mt-12 border-t border-gray-200 pt-8 flex flex-col sm:flex-row items-center justify-between">
              <p className="text-base text-gray-500">© {new Date().getFullYear()} Lsx 批發。版權所有。</p>
              <div className="flex space-x-6 mt-4 sm:mt-0">{/* social icons */}</div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
