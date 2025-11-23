"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CartBadge from "@/components/CartBadge";
import { useMemberPermissions } from "@/lib/memberPermissions";

interface HotProduct {
  id: number;
  title: string;
  retail_price_twd: number | null;
  wholesale_price_twd: number | null;
  cover_image_url: string | null;
}

export default function HotProductsPage() {
  const [products, setProducts] = useState<HotProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // 會員權限
  const { loading: permissionsLoading, error: permissionsError, data: permissions } = useMemberPermissions();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/hot-products");
        if (res.ok) {
          const body = await res.json();
          setProducts(body.products || []);
        }
      } catch (e) {
        console.error("load hot products failed", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
            <Link
              href="/products"
              className="flex min-w-[96px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-200 text-gray-800 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-gray-300 transition-colors"
            >
              <span className="truncate">所有商品</span>
            </Link>
            <CartBadge />
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap justify-between gap-3 pb-4">
            <h1 className="text-3xl font-black text-gray-900 leading-tight tracking-[-0.033em]">熱銷商品</h1>
            <p className="text-sm text-gray-600">此頁面顯示由管理員在後台標記的熱銷商品。</p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-gray-600">載入中...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">目前尚未設定熱銷商品</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => (
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
          )}
        </div>
      </main>
    </div>
  );
}

