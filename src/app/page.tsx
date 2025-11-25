"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BannerCarousel from "@/components/BannerCarousel";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CountdownTimer from "@/components/CountdownTimer";

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

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAnnouncements, setShowAnnouncements] = useState(true);

  const [bestsellers, setBestsellers] = useState<RetailProduct[]>([]);
  const [bsLoading, setBsLoading] = useState(true);

  const [limitedTimeProducts, setLimitedTimeProducts] = useState<any[]>([]);
  const [limitedLoading, setLimitedLoading] = useState(true);

  const [userTier, setUserTier] = useState<string>("guest");

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

    const fetchLimitedTimeProducts = async () => {
      try {
        const res = await fetch("/api/limited-time-products");
        if (res.ok) {
          const json = await res.json();
          setLimitedTimeProducts(json.products || []);
        }
      } catch (e) {
        console.error("Failed to fetch limited time products:", e);
      } finally {
        setLimitedLoading(false);
      }
    };
    fetchLimitedTimeProducts();
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
          // Fetch Profile for Tier
          const { data: profileData } = await supabase
            .from("profiles")
            .select("tier")
            .eq("user_id", user.id)
            .single();

          if (profileData) {
            setUserTier(profileData.tier || "guest");
          }
        } else {
          setUserTier("guest");
        }
      } catch (e) {
        console.error("載入登入狀態失敗（首頁）", e);
      }
    })();
  }, []);

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden" style={{ backgroundColor: '#f8f8f5' }}>
      <div className="layout-container flex h-full grow flex-col">
        <Header />

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

              {/* Limited Time Products Section */}
              {limitedTimeProducts.length > 0 && (
                <section>
                  <div className="flex justify-between items-center px-0 pb-3 pt-5">
                    <div className="flex items-center gap-2">
                      <h2 className="text-gray-900 text-[22px] font-bold leading-tight tracking-[-0.015em]">限定時間商品</h2>
                      <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">LIMITED</span>
                    </div>
                  </div>
                  <div className="flex overflow-x-auto [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-4">
                    <div className="flex items-stretch p-4 gap-4">
                      {limitedLoading && Array.from({ length: 4 }).map((_, idx) => (
                        <div key={`lt-skel-${idx}`} className="flex h-full flex-1 flex-col gap-4 rounded-xl bg-white shadow-sm border border-gray-200 min-w-60 overflow-hidden animate-pulse">
                          <div className="w-full bg-gray-100 aspect-square" />
                          <div className="p-4 pt-0">
                            <div className="h-5 bg-gray-100 rounded w-4/5 mb-2" />
                            <div className="h-6 bg-gray-100 rounded w-2/5" />
                          </div>
                        </div>
                      ))}

                      {!limitedLoading && limitedTimeProducts.map((product) => (
                        <div key={product.id} className="relative flex h-full flex-1 flex-col gap-4 rounded-xl bg-white shadow-sm border border-gray-200 min-w-60 overflow-hidden group">
                          <div className="absolute top-2 left-2 z-10">
                            <CountdownTimer endTime={product.limited_time_end} className="bg-white/90 backdrop-blur px-2 py-1 rounded-lg shadow-sm" />
                          </div>
                          <div
                            className="w-full bg-center bg-no-repeat aspect-square bg-cover"
                            style={{ backgroundImage: `url("${product.cover_image_url || 'https://via.placeholder.com/300'}")` }}
                          />
                          <div className="flex flex-col flex-1 justify-between p-4 pt-0 gap-4">
                            <div>
                              <p className="text-gray-800 text-base font-medium leading-normal line-clamp-2">{product.title}</p>
                              {userTier !== "guest" && (
                                <p className="text-primary text-lg font-bold leading-normal mt-1">
                                  {(userTier === "wholesale" || userTier === "vip")
                                    ? (product.wholesale_price_twd ? `NT$ ${product.wholesale_price_twd}` : `NT$ ${product.retail_price_twd}`)
                                    : (product.retail_price_twd ? `NT$ ${product.retail_price_twd}` : '價格待定')}
                                </p>
                              )}
                            </div>
                            <Link href={`/products/${product.id}`} className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-red-600 text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-red-700 transition-colors">
                              <span className="truncate">立即搶購</span>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

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

        <Footer />
      </div>
    </div>
  );
}
