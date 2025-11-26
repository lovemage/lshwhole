"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import CartBadge from "@/components/CartBadge";
import { useMemberPermissions } from "@/lib/memberPermissions";
import CountdownTimer from "@/components/CountdownTimer";

interface Variant {
  id: string;
  name: string;
  options: Record<string, string>;
  price: number;
  stock: number;
  sku: string;
}

interface ProductDetail {
  id: string;
  sku: string;
  title_zh: string;
  title_original: string;
  desc_zh: string;
  desc_original: string;
  retail_price_twd: number;
  wholesale_price_twd: number | null;
  status: string;
  images: string[];
  created_at: string;
  updated_at: string;
  is_limited_time?: boolean;
  limited_time_end?: string;
  specs?: { name: string; values: string[] }[];
  variants?: Variant[];
}

interface RelatedProduct {
  id: number;
  title: string;
  retail_price_twd: number;
  cover_image_url: string | null;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  origin: string;
  variantId?: string;
  variantName?: string;
}

const CART_STORAGE_KEY = "lsx_cart";

const loadCartFromStorage = (): CartItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
};

const saveCartToStorage = (items: CartItem[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    // 觸發自定義事件通知購物車更新
    window.dispatchEvent(new Event("cartUpdated"));
  } catch {
    // ignore
  }
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email: string | null } | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [currentVariant, setCurrentVariant] = useState<Variant | null>(null);

  // 會員權限
  const { loading: permissionsLoading, error: permissionsError, data: permissions } = useMemberPermissions();

  useEffect(() => {
    const fetchAuthAndWallet = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
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
        console.error("取得登入狀態失敗（商品詳情）", e);
      }
    };

    fetchAuthAndWallet();
  }, []);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!params.id) return;

      try {
        setLoading(true);

        const headers: HeadersInit = {};
        try {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          }
        } catch (e) {
          console.error("取得登入狀態失敗（商品詳情）", e);
        }

        const response = await fetch(`/api/products/${params.id}`, {
          headers,
        });

        if (!response.ok) {
          throw new Error("商品不存在或已下架");
        }

        const data = await response.json();
        setProduct(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "載入商品失敗");
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [params.id]);

  // Initialize default options
  useEffect(() => {
    if (product?.specs && product.specs.length > 0 && Object.keys(selectedOptions).length === 0) {
      const defaults: Record<string, string> = {};
      product.specs.forEach(s => {
        if (s.values.length > 0) defaults[s.name] = s.values[0];
      });
      setSelectedOptions(defaults);
    }
  }, [product]);

  // Find matching variant
  useEffect(() => {
    if (!product?.variants || product.variants.length === 0) {
      setCurrentVariant(null);
      return;
    }
    const variant = product.variants.find(v => {
      return Object.entries(selectedOptions).every(([key, val]) => v.options[key] === val);
    });
    setCurrentVariant(variant || null);
  }, [selectedOptions, product]);

  // 獲取相關商品
  useEffect(() => {
    const fetchRelatedProducts = async () => {
      if (!params.id) return;

      try {
        setRelatedLoading(true);
        const response = await fetch(`/api/products/${params.id}/related?limit=4`);

        if (response.ok) {
          const data = await response.json();
          setRelatedProducts(data);
        } else {
          // 相關商品抓取失敗時不影響主商品頁，只記錄警告
          console.warn("Failed to fetch related products (non-OK response)");
          setRelatedProducts([]);
        }
      } catch (err) {
        console.warn("Error fetching related products:", err);
        setRelatedProducts([]);
      } finally {
        setRelatedLoading(false);
      }
    };

    // 只有在商品載入成功後才獲取相關商品
    if (product && !loading) {
      fetchRelatedProducts();
    }
  }, [params.id, product, loading]);

  const handleAddToCart = () => {
    if (!product) return;
    if (typeof window === "undefined") return;

    // 根據會員等級決定價格
    const priceType = permissions?.permissions.price_type || 'retail';
    let unitPrice = 0;
    if (priceType === 'wholesale') {
      unitPrice = (product.wholesale_price_twd ?? product.retail_price_twd) || 0;
    } else {
      unitPrice = product.retail_price_twd || 0;
    }

    // Override with variant price if selected
    if (currentVariant) {
      // Assuming variant price is retail price override. 
      // If wholesale logic applies to variants, we might need variant wholesale price.
      // For now, let's assume variant price overrides base retail, and we apply same ratio or just use it.
      // If the system is simple, maybe variant price IS the price.
      // Let's assume variant.price is the retail price.
      if (priceType === 'wholesale') {
        // If we don't have wholesale variant price, maybe calculate it?
        // Or just use the ratio from main product?
        // Let's assume variant price is retail, and wholesale is 25/35 ratio or similar?
        // Or just use the variant price as is if user is retail, but what if wholesale?
        // Let's just use variant price for now.
        unitPrice = currentVariant.price;
      } else {
        unitPrice = currentVariant.price;
      }
    }

    if (unitPrice <= 0) {
      console.warn("商品價格異常，無法加入購物車");
      return;
    }

    const id = product.id?.toString() ?? "";
    if (!id) return;

    const currentCart = loadCartFromStorage();

    const image =
      (product.images && product.images.length > 0
        ? product.images[0]
        : "https://images.unsplash.com/photo-1590155294835-6b3fb5b0b9a5?q=80&w=200&auto=format&fit=crop");

    const existingIndex = currentCart.findIndex((item) =>
      item.id === id && item.variantId === currentVariant?.id
    );

    if (existingIndex >= 0) {
      currentCart[existingIndex] = {
        ...currentCart[existingIndex],
        quantity: currentCart[existingIndex].quantity + quantity,
      };
    } else {
      currentCart.push({
        id,
        name: product.title_zh || product.title_original || "商品",
        price: unitPrice,
        quantity,
        image,
        origin: "國際",
        variantId: currentVariant?.id,
        variantName: currentVariant?.name,
      });
    }

    saveCartToStorage(currentCart);
    console.log(
      `加入購物車：${quantity} x ${product.title_zh || product.title_original}`
    );
  };


  // 處理圖片數組，如果沒有圖片則使用預設圖片
  const getProductImages = () => {
    if (product?.images && product.images.length > 0) {
      return product.images;
    }
    // 預設圖片
    return [
      "https://images.unsplash.com/photo-1590155294835-6b3fb5b0b9a5?q=80&w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1620752762399-9e88d6b1d0a5?q=80&w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1590439471364-192aa70c0b23?q=80&w=600&auto=format&fit=crop",
    ];
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: "#f8f8f5" }} className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
        <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between whitespace-nowrap border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-3">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-3 text-gray-800">
                <div className="size-6 text-primary">
                  <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path d="M44 11.2727C44 14.0109 39.8386 16.3957 33.69 17.6364C39.8386 18.877 44 21.2618 44 24C44 26.7382 39.8386 29.123 33.69 30.3636C39.8386 31.6043 44 33.9891 44 36.7273C44 40.7439 35.0457 44 24 44C12.9543 44 4 40.7439 4 36.7273C4 33.9891 8.16144 31.6043 14.31 30.3636C8.16144 29.123 4 26.7382 4 24C4 21.2618 8.16144 18.877 14.31 17.6364C8.16144 16.3957 4 14.0109 4 11.2727C4 7.25611 12.9543 4 24 4C35.0457 4 44 7.25611 44 11.2727Z" fill="currentColor"></path>
                  </svg>
                </div>
                <h2 className="text-gray-900 text-lg font-bold leading-tight tracking-[-0.015em]">LshWholesale</h2>
              </Link>
            </div>
            <div className="flex gap-2">
              <Link href="/register" className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors">
                <span className="truncate">註冊</span>
              </Link>
              <Link href="/login" className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-200 text-gray-800 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-gray-300 transition-colors">
                <span className="truncate">登入</span>
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
          <div className="flex items-center justify-center min-h-96">
            <p className="text-gray-600 text-lg">載入中...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={{ backgroundColor: "#f8f8f5" }} className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
        <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between whitespace-nowrap border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-3">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-3 text-gray-800">
                <div className="size-6 text-primary">
                  <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path d="M44 11.2727C44 14.0109 39.8386 16.3957 33.69 17.6364C39.8386 18.877 44 21.2618 44 24C44 26.7382 39.8386 29.123 33.69 30.3636C39.8386 31.6043 44 33.9891 44 36.7273C44 40.7439 35.0457 44 24 44C12.9543 44 4 40.7439 4 36.7273C4 33.9891 8.16144 31.6043 14.31 30.3636C8.16144 29.123 4 26.7382 4 24C4 21.2618 8.16144 18.877 14.31 17.6364C8.16144 16.3957 4 14.0109 4 11.2727C4 7.25611 12.9543 4 24 4C35.0457 4 44 7.25611 44 11.2727Z" fill="currentColor"></path>
                  </svg>
                </div>
                <h2 className="text-gray-900 text-lg font-bold leading-tight tracking-[-0.015em]">LshWholesale</h2>
              </Link>
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
                    onClick={async () => {
                      try {
                        await supabase.auth.signOut();
                      } catch (e) {
                        console.error("登出失敗", e);
                      } finally {
                        router.push("/");
                      }
                    }}
                    className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-100 text-gray-700 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-gray-200 transition-colors"
                  >
                    <span className="truncate">登出</span>
                  </button>
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
                </>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
          <div className="flex flex-col items-center justify-center min-h-96 gap-4">
            <p className="text-red-600 text-lg font-medium">{error || '商品不存在'}</p>
            <Link href="/products" className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
              返回商品列表
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const productImages = getProductImages();

  const DescriptionSection = () => (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">產品描述</h3>
      <div className="space-y-4">
        {/* 原文描述為主 */}
        {product?.desc_original && (
          <div>
            <div
              className="text-gray-800 leading-relaxed whitespace-pre-wrap text-base"
              dangerouslySetInnerHTML={{ __html: product.desc_original }}
            />
          </div>
        )}

        {/* 中文翻譯區塊（較小字體） */}
        {product?.desc_zh && product.desc_zh !== product.desc_original && (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <h4 className="text-sm font-bold text-gray-500 mb-2">中文翻譯</h4>
            <div
              className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: product.desc_zh }}
            />
          </div>
        )}

        {!product?.desc_zh && !product?.desc_original && (
          <p className="text-gray-500 italic">暫無產品描述</p>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ backgroundColor: "#f8f8f5" }} className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between whitespace-nowrap border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-3">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 text-gray-800">
              <div className="size-6 text-primary">
                <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path d="M44 11.2727C44 14.0109 39.8386 16.3957 33.69 17.6364C39.8386 18.877 44 21.2618 44 24C44 26.7382 39.8386 29.123 33.69 30.3636C39.8386 31.6043 44 33.9891 44 36.7273C44 40.7439 35.0457 44 24 44C12.9543 44 4 40.7439 4 36.7273C4 33.9891 8.16144 31.6043 14.31 30.3636C8.16144 29.123 4 26.7382 4 24C4 21.2618 8.16144 18.877 14.31 17.6364C8.16144 16.3957 4 14.0109 4 11.2727C4 7.25611 12.9543 4 24 4C35.0457 4 44 7.25611 44 11.2727Z" fill="currentColor"></path>
                </svg>
              </div>
              <h2 className="text-gray-900 text-lg font-bold leading-tight tracking-[-0.015em]">LshWholesale</h2>
            </Link>
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
                  onClick={async () => {
                    try {
                      await supabase.auth.signOut();
                    } catch (e) {
                      console.error("登出失敗", e);
                    } finally {
                      router.push("/");
                    }
                  }}
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
        {/* Breadcrumbs */}
        <div className="flex flex-wrap gap-2 py-4 mb-8">
          <Link href="/" className="text-gray-600 hover:text-primary text-sm font-medium leading-normal transition-colors">首頁</Link>
          <span className="text-gray-600 text-sm font-medium leading-normal">/</span>
          <Link href="/products" className="text-gray-600 hover:text-primary text-sm font-medium leading-normal transition-colors">商品</Link>
          <span className="text-gray-600 text-sm font-medium leading-normal">/</span>
          <span className="text-gray-900 text-sm font-medium leading-normal">{product.title_zh || product.title_original}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-16">
          {/* Left Column: Image Gallery */}
          <div className="flex flex-col gap-4">
            <div className="relative bg-gray-100 rounded-xl overflow-hidden aspect-square flex items-center justify-center group">
              <img
                src={productImages[selectedImage]}
                alt={product.title_zh || product.title_original}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setShowModal(true)}
              />
              <button
                onClick={() => setShowModal(true)}
                className="absolute bottom-4 right-4 p-2 bg-white/80 hover:bg-white text-gray-800 rounded-full shadow-md backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 z-10"
                title="查看大圖"
              >
                <span className="material-symbols-outlined block">open_in_full</span>
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto">
              {productImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${selectedImage === index ? "border-primary" : "border-gray-200"
                    }`}
                >
                  <img src={image} alt={`${product.title_zh || product.title_original} ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            {/* Desktop Description */}
            <div className="hidden lg:block mt-8">
              <DescriptionSection />
            </div>
          </div>

          {/* Right Column: Product Information */}
          <div className="flex flex-col gap-6">
            {/* Product Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">SKU: {product.sku}</span>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-800">{product.status === 'published' ? '已上架' : '未上架'}</span>
              </div>
              {/* 主標題：優先顯示原文 */}
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.title_original || product.title_zh}</h1>

              {/* 副標題：中文翻譯（較小字體） */}
              {product.title_zh && product.title_original && product.title_zh !== product.title_original && (
                <p className="text-lg text-gray-600 mb-2 font-medium">{product.title_zh}</p>
              )}
            </div>

            {/* Price */}
            <div className="border-t border-b border-gray-200 py-4">
              {product.is_limited_time && product.limited_time_end && (
                <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-red-600">alarm</span>
                    <span className="text-red-800 font-bold">限時販售中</span>
                  </div>
                  <CountdownTimer
                    endTime={product.limited_time_end}
                    style="detail"
                    onExpire={() => setIsExpired(true)}
                  />
                </div>
              )}
              <div className="flex flex-col gap-2">
                {/* 根據會員等級顯示價格 */}
                {permissions?.permissions.price_type === 'none' && (
                  <p className="text-lg text-gray-500">登入後可見價格</p>
                )}
                {permissions?.permissions.price_type === 'retail' && (
                  <div>
                    <p className="text-sm text-gray-600">零售價</p>
                    <p className="text-4xl font-bold text-gray-900">
                      NT$ {currentVariant ? currentVariant.price : product.retail_price_twd}
                    </p>
                  </div>
                )}
                {permissions?.permissions.price_type === 'wholesale' && (
                  <>
                    <div>
                      <p className="text-sm text-primary">批發價</p>
                      <p className="text-4xl font-bold text-primary">
                        NT$ {product.wholesale_price_twd ?? product.retail_price_twd}
                      </p>
                    </div>
                    {product.retail_price_twd && (
                      <div>
                        <p className="text-sm text-gray-600">零售價</p>
                        <p className="text-xl text-gray-600">NT$ {product.retail_price_twd}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            {/* Specifications Selection */}
            {product.specs && product.specs.length > 0 && (
              <div className="border-b border-gray-200 pb-4">
                {product.specs.map((spec) => (
                  <div key={spec.name} className="mb-4 last:mb-0">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">{spec.name}</h3>
                    <div className="flex flex-wrap gap-2">
                      {spec.values.map((value) => (
                        <button
                          key={value}
                          onClick={() => setSelectedOptions(prev => ({ ...prev, [spec.name]: value }))}
                          className={`px-3 py-1.5 text-sm rounded-md border transition-all ${selectedOptions[spec.name] === value
                            ? "border-primary bg-primary/5 text-primary font-medium"
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                            }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Description (Mobile Only) */}
            <div className="lg:hidden">
              <DescriptionSection />
            </div>

            {/* Product Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">商品資訊</h3>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">商品編號</span>
                  <span className="text-gray-900 font-medium">{product.sku}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">狀態</span>
                  <span className="text-gray-900 font-medium">{product.status === 'published' ? '已上架' : '未上架'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">上架時間</span>
                  <span className="text-gray-900 font-medium">{new Date(product.created_at).toLocaleDateString('zh-TW')}</span>
                </div>
              </div>
            </div>

            {/* Add to Cart */}
            <div className="flex gap-4">
              <div className="flex items-center border border-gray-300 rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2 text-gray-600 hover:text-gray-900"
                >
                  −
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 text-center border-l border-r border-gray-300 py-2 focus:outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 py-2 text-gray-600 hover:text-gray-900"
                >
                  +
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={product.status !== 'published' || isExpired}
                className={`flex-1 font-bold py-2 px-4 rounded-lg transition-all duration-100 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${isExpired
                  ? "bg-gray-400 text-white"
                  : "bg-primary text-white hover:bg-primary/90"
                  }`}
              >
                {product.status !== 'published'
                  ? '商品未上架'
                  : isExpired
                    ? '販售結束'
                    : '加入購物車'}
              </button>
            </div>

            {/* Related Products */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">相關商品</h3>
              {relatedLoading ? (
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
                      <div className="aspect-square w-full bg-gray-200"></div>
                      <div className="p-3">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : relatedProducts.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {relatedProducts.map((relatedProduct) => (
                    <Link
                      key={relatedProduct.id}
                      href={`/products/${relatedProduct.id}`}
                      className="group relative flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden transition-all hover:shadow-lg"
                    >
                      <div className="aspect-square w-full overflow-hidden bg-gray-100">
                        <img
                          src={relatedProduct.cover_image_url || "https://images.unsplash.com/photo-1590155294835-6b3fb5b0b9a5?q=80&w=300&auto=format&fit=crop"}
                          alt={relatedProduct.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="p-3">
                        <h4 className="text-sm font-medium text-gray-800 line-clamp-2">{relatedProduct.title}</h4>
                        <p className="text-sm font-bold text-gray-900 mt-1">NT${relatedProduct.retail_price_twd}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>暫無相關商品</p>
                </div>
              )}
            </div>
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
              <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase">公司</h3>
              <ul className="space-y-2">
                <li><Link className="text-gray-700 hover:text-primary text-sm font-medium leading-normal transition-colors" href="#">關於我們</Link></li>
                <li><Link className="text-gray-700 hover:text-primary text-sm font-medium leading-normal transition-colors" href="#">如何運作</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase">電子報</h3>
              <p className="text-gray-600 text-sm">獲取最新的產品更新和即將推出的銷售資訊。</p>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-200 pt-8 flex flex-col sm:flex-row items-center justify-between">
            <p className="text-gray-600 text-sm">© {new Date().getFullYear()} LshWholesale。版權所有。</p>
          </div>
        </div>
      </footer>

      {/* Full Screen Image Modal */}
      {
        showModal && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center backdrop-blur-sm" onClick={() => setShowModal(false)}>
            <button
              className="absolute top-4 right-4 p-2 text-white/70 hover:text-white z-50"
              onClick={() => setShowModal(false)}
            >
              <span className="material-symbols-outlined text-4xl">close</span>
            </button>

            <div className="relative w-full h-full max-w-7xl max-h-screen flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
              <img
                src={productImages[selectedImage]}
                alt={product.title_zh || product.title_original}
                className="max-w-full max-h-full object-contain"
              />

              {productImages.length > 1 && (
                <>
                  <button
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage(prev => (prev - 1 + productImages.length) % productImages.length);
                    }}
                  >
                    <span className="material-symbols-outlined text-3xl">chevron_left</span>
                  </button>

                  <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage(prev => (prev + 1) % productImages.length);
                    }}
                  >
                    <span className="material-symbols-outlined text-3xl">chevron_right</span>
                  </button>

                  {/* Thumbnails in Modal */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[90vw] p-2 rounded-lg bg-black/50">
                    {productImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImage(idx);
                        }}
                        className={`w-12 h-12 flex-shrink-0 rounded overflow-hidden border-2 ${selectedImage === idx ? 'border-white' : 'border-transparent opacity-50 hover:opacity-80'}`}
                      >
                        <img src={img} alt={`thumbnail ${idx}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )
      }
    </div>
  );
}
