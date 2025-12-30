"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

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
  const [cartItems, setCartItems] = useState<CartItem[]>(() => loadCartFromStorage());

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
      <Header />

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

      <Footer />
    </div>
  );
}
