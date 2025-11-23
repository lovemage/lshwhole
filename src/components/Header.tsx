"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import CartBadge from "@/components/CartBadge";

export default function Header() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ email: string | null } | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchUserStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
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
        console.error("載入登入狀態失敗", e);
      }
    };
    fetchUserStatus();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
         fetchUserStatus();
      } else if (event === 'SIGNED_OUT') {
         setCurrentUser(null);
         setWalletBalance(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/");
      setCurrentUser(null);
      setWalletBalance(null);
      setIsMobileMenuOpen(false);
    } catch (e) {
      console.error("登出失敗", e);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-sm">
      <div className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-gray-200 px-4 sm:px-6 lg:px-10 py-3">
        <div className="flex items-center gap-4 lg:gap-8">
          {/* Hamburger Menu Button (Mobile) */}
          <button
            onClick={toggleMobileMenu}
            className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 focus:outline-none"
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>

          <Link href="/" className="flex items-center gap-3 text-gray-800">
            <div className="h-8 w-auto">
              <img src="/logo/5.png" alt="LshWholesale Logo" className="h-full w-auto object-contain" />
            </div>
            <h2 className="text-gray-900 text-lg font-bold leading-tight tracking-[-0.015em]">LshWholesale</h2>
          </Link>
          
          {/* Desktop Navigation */}
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
          
          {/* Desktop User Actions */}
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

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-white border-b border-gray-200 shadow-lg max-h-[calc(100vh-64px)] overflow-y-auto">
          <div className="flex flex-col p-4 space-y-4">
            {/* Search Bar (Mobile) */}
            <div className="flex w-full items-stretch rounded-lg h-10 bg-gray-100">
              <div className="text-gray-500 flex items-center justify-center pl-3">
                <span className="material-symbols-outlined !text-xl">search</span>
              </div>
              <input
                className="flex-1 bg-transparent border-none focus:ring-0 px-2 text-sm"
                placeholder="搜尋商品..."
              />
            </div>

            {/* Navigation Links */}
            <nav className="flex flex-col space-y-2">
              <Link onClick={() => setIsMobileMenuOpen(false)} className="text-gray-700 hover:text-primary font-medium py-2 border-b border-gray-100" href="/">首頁</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} className="text-gray-700 hover:text-primary font-medium py-2 border-b border-gray-100" href="/products">商品</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} className="text-gray-700 hover:text-primary font-medium py-2 border-b border-gray-100" href="/products">韓國</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} className="text-gray-700 hover:text-primary font-medium py-2 border-b border-gray-100" href="/products">日本</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} className="text-gray-700 hover:text-primary font-medium py-2 border-b border-gray-100" href="/products">泰國</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} className="text-gray-700 hover:text-primary font-medium py-2 border-b border-gray-100" href="/howtogo">如何運作</Link>
            </nav>

            {/* User Actions */}
            <div className="flex flex-col space-y-3 pt-2">
              {currentUser ? (
                <>
                  <div className="flex justify-between items-center text-sm text-gray-700">
                    <span>儲值金</span>
                    <span className="font-semibold">NT$ {walletBalance ?? 0}</span>
                  </div>
                  <Link
                    href="/member"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full py-2 bg-gray-200 text-gray-800 text-center rounded-lg font-bold hover:bg-gray-300"
                  >
                    會員中心
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full py-2 bg-gray-100 text-gray-700 text-center rounded-lg font-bold hover:bg-gray-200"
                  >
                    登出
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="py-2 bg-gray-200 text-gray-800 text-center rounded-lg font-bold hover:bg-gray-300"
                  >
                    登入
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="py-2 bg-primary text-white text-center rounded-lg font-bold hover:bg-primary/90"
                  >
                    註冊
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
