"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMemberPermissions } from "@/lib/memberPermissions";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

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
      <Header />

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

      <Footer />
    </div>
  );
}
