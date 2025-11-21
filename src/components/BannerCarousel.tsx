"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Banner {
  id: number;
  image_url: string;
  title?: string;
  description?: string;
  link_url?: string;
  sort: number;
  active: boolean;
}

interface BannerCarouselProps {
  type: "index" | "products";
  className?: string;
}

export default function BannerCarousel({ type, className = "" }: BannerCarouselProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [interval, setInterval] = useState(5);
  const [loading, setLoading] = useState(true);

  // 獲取橫幅資料
  const fetchBanners = async () => {
    try {
      const endpoint = type === "index" ? "/api/banners/index" : "/api/banners/products";
      const res = await fetch(`${endpoint}?active=true`);
      if (res.ok) {
        const data = await res.json();
        setBanners(data.data || []);
      } else {
        console.error("Failed to fetch banners:", res.status, res.statusText);
        // 如果沒有橫幅資料，設置一個預設橫幅
        if (type === "index") {
          setBanners([{
            id: 0,
            image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuB9h8q2R6rrIzVaGdFUFVhWKZISeTfjaafGAExcbhGU6Xxnmo5mM2xGIC80bRtWdJ6cV3ls5iFeim4pyNR3Tu2T6qz0IADVlj1Or-X-ylogBm5t2GdwfKQ2gV54baigw6PbVYyk5noMbC8FoEJcDICg3ISrV7IDjW38QYecmgtpITA3hKZUOHtxri0jyqQlodNWNuqfMxevR3QzcqDCXw7zQqB2e_kWEeoS-diStfDpjuZ8PqfQ9LlqDs8_8seD1A1FgNR-dV3spfP6",
            title: "Lsx 批發：您的全球採購夥伴",
            description: "來自韓國、日本和泰國的正品批發商品。",
            link_url: "/products",
            sort: 0,
            active: true
          }]);
        } else {
          setBanners([{
            id: 0,
            image_url: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1200&auto=format&fit=crop",
            sort: 0,
            active: true
          }]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch banners:", error);
      // 設置預設橫幅
      if (type === "index") {
        setBanners([{
          id: 0,
          image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuB9h8q2R6rrIzVaGdFUFVhWKZISeTfjaafGAExcbhGU6Xxnmo5mM2xGIC80bRtWdJ6cV3ls5iFeim4pyNR3Tu2T6qz0IADVlj1Or-X-ylogBm5t2GdwfKQ2gV54baigw6PbVYyk5noMbC8FoEJcDICg3ISrV7IDjW38QYecmgtpITA3hKZUOHtxri0jyqQlodNWNuqfMxevR3QzcqDCXw7zQqB2e_kWEeoS-diStfDpjuZ8PqfQ9LlqDs8_8seD1A1FgNR-dV3spfP6",
          title: "Lsx 批發：您的全球採購夥伴",
          description: "來自韓國、日本和泰國的正品批發商品。",
          link_url: "/products",
          sort: 0,
          active: true
        }]);
      }
    } finally {
      setLoading(false);
    }
  };

  // 獲取輪播設定
  const fetchSettings = async () => {
    try {
      const pageType = type === "index" ? "index" : "products";
      const res = await fetch(`/api/banner-settings?page_type=${pageType}`);
      if (res.ok) {
        const data = await res.json();
        setInterval(data.data?.carousel_interval || 5);
      }
    } catch (error) {
      console.error("Failed to fetch banner settings:", error);
    }
  };

  useEffect(() => {
    fetchBanners();
    fetchSettings();
  }, [type]);

  // 自動輪播
  useEffect(() => {
    if (banners.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, interval * 1000);

    return () => clearInterval(timer);
  }, [banners.length, interval]);

  // 手動切換
  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  if (loading) {
    return (
      <div className={`relative bg-gray-200 animate-pulse ${className}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400">載入中...</div>
        </div>
      </div>
    );
  }

  if (banners.length === 0) {
    return null; // 沒有橫幅時不顯示
  }

  const currentBanner = banners[currentIndex];

  const BannerContent = () => (
    <div
      className={`relative w-full bg-cover bg-center bg-no-repeat ${className}`}
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.5) 100%), url("${currentBanner.image_url}")`,
      }}
    >
      {/* 首頁橫幅：顯示標題和描述 */}
      {type === "index" && (currentBanner.title || currentBanner.description) && (
        <div className="absolute inset-0 flex items-end">
          <div className="p-6 sm:p-8 lg:p-12 max-w-2xl">
            {currentBanner.title && (
              <h1 className="text-white text-3xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-[-0.033em] mb-4">
                {currentBanner.title}
              </h1>
            )}
            {currentBanner.description && (
              <p className="text-gray-200 text-base sm:text-lg font-normal leading-normal mb-6">
                {currentBanner.description}
              </p>
            )}
            {currentBanner.link_url && (
              <Link
                href={currentBanner.link_url}
                className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white text-base font-bold rounded-lg hover:bg-primary/90 transition-colors"
              >
                了解更多
              </Link>
            )}
          </div>
        </div>
      )}

      {/* 導航箭頭 */}
      {banners.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center transition-colors"
            aria-label="上一張"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center transition-colors"
            aria-label="下一張"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </>
      )}

      {/* 指示點 */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentIndex
                  ? "bg-white"
                  : "bg-white/50 hover:bg-white/75"
              }`}
              aria-label={`切換到第 ${index + 1} 張`}
            />
          ))}
        </div>
      )}
    </div>
  );

  // 如果有連結，包裝在 Link 中
  if (currentBanner.link_url && type === "products") {
    return (
      <Link href={currentBanner.link_url} className="block">
        <BannerContent />
      </Link>
    );
  }

  return <BannerContent />;
}
