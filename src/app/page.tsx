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
    wholesale_price_twd: number | null;
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

  const renderProductCard = (product: any, isLimited = false) => {
    const isWholesale = userTier === "wholesale" || userTier === "vip";
    const price = isWholesale ? (product.wholesale_price_twd ?? product.retail_price_twd) : product.retail_price_twd;
    const retailPrice = product.retail_price_twd;

    return (
      <Link
        key={product.id}
        href={`/products/${product.id}`}
        className="group flex flex-col bg-white rounded-[1.5rem] sm:rounded-[2rem] p-3 hover:shadow-[0_15px_30px_-5px_rgba(0,0,0,0.05)] transition-all duration-300 border border-transparent hover:border-primary/20 hover:-translate-y-1.5"
      >
        <div className="aspect-square w-full overflow-hidden rounded-2xl bg-gray-50 relative mb-3">
          {isLimited && (
             <div className="absolute top-2 left-2 z-10">
                <CountdownTimer endTime={product.limited_time_end} className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-sm" />
             </div>
          )}
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
          <h3 className="text-[15px] text-gray-700 leading-snug grow line-clamp-2 font-bold mb-2 group-hover:text-primary transition-colors tracking-tight">
            {product.title || product.title_zh || product.title_original}
          </h3>
          
          <div className="mt-auto flex items-end justify-between border-t border-gray-50 pt-3">
            <div className="flex flex-col">
              {userTier === 'guest' ? (
                  <p className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-1 rounded-md">登入查看價格</p>
              ) : (
                  <>
                    <div className="flex flex-col">
                      <span className={`text-lg font-black tracking-tight ${isWholesale ? 'text-primary' : 'text-gray-800'}`}>
                        NT$ {price?.toLocaleString() ?? '???'}
                      </span>
                      {isWholesale && retailPrice && (
                          <span className="text-xs text-gray-300 line-through decoration-gray-300">NT$ {retailPrice.toLocaleString()}</span>
                      )}
                    </div>
                  </>
              )}
            </div>
            
            {/* Cart Icon */}
            <button className="w-8 h-8 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-primary hover:text-white transition-colors group-hover:scale-110">
               <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
            </button>
          </div>
        </div>
      </Link>
    );
  };

  const SectionHeader = ({ title, icon, colorClass = "text-gray-900" }: { title: string, icon?: string, colorClass?: string }) => (
    <div className="flex justify-center items-center mb-8 relative">
       <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-dashed border-gray-200"></div>
       </div>
       <div className="relative flex items-center gap-2 bg-[#f8f8f5] px-6 py-2 rounded-full border border-gray-100 shadow-sm">
          {icon && <span className={`material-symbols-outlined ${colorClass}`}>{icon}</span>}
          <h2 className={`text-xl font-black tracking-tight ${colorClass}`}>{title}</h2>
       </div>
    </div>
  );

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden" style={{ backgroundColor: '#fffdf5' }}>
      <div className="layout-container flex h-full grow flex-col">
        <Header />

        <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Announcements Section */}
          {!loading && announcements.length > 0 && showAnnouncements && (
            <div className="mb-8">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-blue-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-600 p-2 rounded-xl">
                      <span className="material-symbols-outlined">campaign</span>
                    </span>
                    <h2 className="text-gray-900 text-lg font-bold">最新公告</h2>
                  </div>
                  <button
                    onClick={() => setShowAnnouncements(false)}
                    className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <span className="material-symbols-outlined text-gray-400 text-lg">close</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                  {announcements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 hover:bg-blue-50 transition-colors"
                    >
                      <h3 className="text-gray-900 text-sm font-bold mb-1">{announcement.title}</h3>
                      <p className="text-gray-600 text-xs line-clamp-2">
                        {announcement.content.replace(/<[^>]*>/g, "")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Hero Banner */}
          <section className="mb-12">
            <div className="rounded-[2.5rem] overflow-hidden shadow-xl shadow-yellow-500/10 border-4 border-white ring-1 ring-gray-100 transform hover:scale-[1.005] transition-transform duration-500">
              <BannerCarousel
                type="index"
                className="w-full h-[280px] sm:h-[400px] md:h-[500px] lg:h-[600px]"
              />
            </div>
          </section>

          {/* Features */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16 px-2">
            {[
              { title: "批量折扣", subtitle: "最具競爭力的批發價格", icon: "percent", color: "bg-yellow-50 text-yellow-600" },
              { title: "全球運送", subtitle: "快速可靠的物流服務", icon: "public", color: "bg-blue-50 text-blue-600" },
              { title: "品質檢驗", subtitle: "嚴格把關優質供應商", icon: "verified", color: "bg-green-50 text-green-600" }
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-4 p-5 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${feature.color}`}>
                  <span className="material-symbols-outlined text-2xl">{feature.icon}</span>
                </div>
                <div>
                  <h3 className="text-gray-900 font-bold text-lg">{feature.title}</h3>
                  <p className="text-gray-500 text-sm">{feature.subtitle}</p>
                </div>
              </div>
            ))}
          </section>

          {/* Hot-Selling Products */}
          <section className="mb-16">
            <SectionHeader title="本週熱銷排行" icon="local_fire_department" colorClass="text-red-500" />
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
              {bsLoading && Array.from({ length: 5 }).map((_, idx) => (
                <div key={`bs-skel-${idx}`} className="bg-white rounded-3xl aspect-[3/4] animate-pulse"></div>
              ))}
              {!bsLoading && bestsellers.map((product) => renderProductCard(product))}
            </div>
          </section>

          {/* Limited Time Products Section */}
          {limitedTimeProducts.length > 0 && (
            <section className="mb-16">
              <SectionHeader title="限時搶購專區" icon="timer" colorClass="text-orange-500" />
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
                {limitedLoading && Array.from({ length: 5 }).map((_, idx) => (
                  <div key={`lt-skel-${idx}`} className="bg-white rounded-3xl aspect-[3/4] animate-pulse"></div>
                ))}
                {!limitedLoading && limitedTimeProducts.map((product) => renderProductCard(product, true))}
              </div>
            </section>
          )}

          {/* Popular Products */}
          {displayProducts.popular.length > 0 && (
            <section className="mb-16">
              <SectionHeader title="人氣推薦" icon="thumb_up" colorClass="text-primary" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
                {displayProducts.popular.map((product) => renderProductCard(product))}
              </div>
            </section>
          )}

          {/* Korea Section */}
          {displayProducts.korea.length > 0 && (
            <section className="mb-16">
              <SectionHeader title="韓國直送" icon="flight_takeoff" colorClass="text-purple-500" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
                {displayProducts.korea.map((product) => renderProductCard(product))}
              </div>
            </section>
          )}

          {/* Japan Section */}
          {displayProducts.japan.length > 0 && (
            <section className="mb-16">
              <SectionHeader title="日本選物" icon="ramen_dining" colorClass="text-pink-500" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
                {displayProducts.japan.map((product) => renderProductCard(product))}
              </div>
            </section>
          )}

          {/* Thailand Section */}
          {displayProducts.thailand.length > 0 && (
            <section className="mb-16">
              <SectionHeader title="泰國好物" icon="sunny" colorClass="text-orange-400" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
                {displayProducts.thailand.map((product) => renderProductCard(product))}
              </div>
            </section>
          )}

        </main>

        <Footer />
      </div>
    </div>
  );
}
