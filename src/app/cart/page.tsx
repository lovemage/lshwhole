"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  origin: string;
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
  } catch {
    // ignore
  }
};

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [currentUser, setCurrentUser] = useState<{ email: string | null } | null>(null);

  useEffect(() => {
    const initialItems = loadCartFromStorage();
    setCartItems(initialItems);

    // 載入會員資訊
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user ?? null;
        if (user) {
          setCurrentUser({ email: user.email ?? null });
        } else {
          setCurrentUser(null);
        }
      } catch (e) {
        console.error("載入登入狀態失敗", e);
      }
    })();
  }, []);

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) return;
    setCartItems((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      );
      saveCartToStorage(updated);
      return updated;
    });
  };

  const removeItem = (id: string) => {
    setCartItems((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      saveCartToStorage(updated);
      return updated;
    });
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const shipping = subtotal > 100 ? 0 : 10;
  const tax = subtotal * 0.05;
  const total = subtotal + shipping + tax;

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
                <span className="text-sm text-gray-700 mr-2">
                  {currentUser.email}
                </span>
                <Link href="/profile" className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-200 text-gray-800 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-gray-300 transition-colors">
                  <span className="truncate">會員中心</span>
                </Link>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.href = "/";
                  }}
                  className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-200 text-gray-800 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-gray-300 transition-colors"
                >
                  <span className="truncate">登出</span>
                </button>
              </>
            ) : (
              <>
                <Link href="/register" className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors">
                  <span className="truncate">註冊</span>
                </Link>
                <Link href="/login" className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-200 text-gray-800 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-gray-300 transition-colors">
                  <span className="truncate">登入</span>
                </Link>
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
          <span className="text-gray-900 text-sm font-medium leading-normal">購物車</span>
        </div>

        <div className="flex flex-wrap justify-between gap-3 pb-8">
          <h1 className="text-4xl font-black text-gray-900 leading-tight tracking-[-0.033em]">您的批發訂單</h1>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-12">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            {cartItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg mb-4">購物車是空的</p>
                <Link href="/products" className="inline-block bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-primary/90 transition-colors">
                  繼續購物
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-gray-200">
                    <tr className="text-gray-600">
                      <th className="px-4 py-3 text-left w-2/5 text-sm font-medium leading-normal">商品</th>
                      <th className="px-4 py-3 text-left w-1/5 text-sm font-medium leading-normal">價格</th>
                      <th className="px-4 py-3 text-center w-1/5 text-sm font-medium leading-normal">數量</th>
                      <th className="px-4 py-3 text-right w-1/5 text-sm font-medium leading-normal">小計</th>
                      <th className="px-4 py-3 text-right w-auto text-sm font-medium leading-normal"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {cartItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-4 w-2/5">
                          <div className="flex items-center gap-4">
                            <img src={item.image} alt={item.name} className="w-16 h-16 rounded-lg object-cover" />
                            <div>
                              <p className="text-gray-900 font-semibold">{item.name}</p>
                              <p className="text-gray-600 text-sm">來自 {item.origin}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 w-1/5 text-gray-800 text-sm">NT${Math.floor(item.price)}</td>
                        <td className="px-4 py-4 w-1/5">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="px-2 py-1 text-gray-600 hover:text-gray-900"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                              className="w-16 text-center rounded border border-gray-300 bg-white text-gray-900 focus:ring-primary focus:border-primary"
                            />
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="px-2 py-1 text-gray-600 hover:text-gray-900"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-4 w-1/5 text-right font-semibold text-gray-900 text-sm">
                          NT${Math.floor(item.price * item.quantity)}
                        </td>
                        <td className="px-4 py-4 w-auto text-right">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-gray-500 hover:text-red-500 transition-colors"
                          >
                            <span className="text-xl">🗑️</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 h-fit">
            <h2 className="text-xl font-bold text-gray-900 mb-6">訂單摘要</h2>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>小計</span>
                <span>NT${Math.floor(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>運費</span>
                <span className={shipping === 0 ? "text-green-600 font-semibold" : ""}>
                  {shipping === 0 ? "免費" : `NT$${Math.floor(shipping)}`}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>稅金 (5%)</span>
                <span>NT${Math.floor(tax)}</span>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 mb-6">
              <div className="flex justify-between text-lg font-bold text-gray-900">
                <span>總計</span>
                <span>NT${Math.floor(total)}</span>
              </div>
            </div>

            {subtotal <= 100 && (
              <p className="text-sm text-gray-600 mb-4 p-3 bg-blue-50 rounded">
                再購買 NT${Math.floor(100 - subtotal)} 即可享受免運費
              </p>
            )}

            <Link
              href="/checkout"
              className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-primary/90 transition-colors text-center block mb-3"
            >
              前往結帳
            </Link>

            <Link
              href="/products"
              className="w-full bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors text-center block"
            >
              繼續購物
            </Link>
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
    </div>
  );
}

