"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const CART_STORAGE_KEY = "lsx_cart";

interface CartItem {
  id: string;
  quantity: number;
}

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

export default function CartBadge() {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    // 初始載入
    const updateCartCount = () => {
      const items = loadCartFromStorage();
      const totalCount = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      setCartCount(totalCount);
    };

    updateCartCount();

    // 監聽 storage 事件（跨頁面同步）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CART_STORAGE_KEY) {
        updateCartCount();
      }
    };

    // 監聽自定義事件（同頁面更新）
    const handleCartUpdate = () => {
      updateCartCount();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("cartUpdated", handleCartUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("cartUpdated", handleCartUpdate);
    };
  }, []);

  return (
    <Link
      href="/cart"
      className="relative flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 bg-gray-200 text-gray-800 gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-2.5 hover:bg-gray-300 transition-colors"
    >
      <span className="material-symbols-outlined !text-xl">shopping_cart</span>
      {cartCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
          {cartCount > 99 ? "99+" : cartCount}
        </span>
      )}
    </Link>
  );
}

