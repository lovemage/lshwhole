"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      if (!data.user) {
        setError("登入失敗，請稍後重試");
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        setError("登入狀態異常，請重新登入");
        return;
      }

      const checkRes = await fetch("/api/auth/check-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!checkRes.ok) {
        let message = "登入失敗，請稍後重試";
        try {
          const body = await checkRes.json();
          if (body?.message) {
            message = body.message;
          }
        } catch {
          // ignore
        }

        await supabase.auth.signOut();
        setError(message);
        return;
      }

      const nextParam = searchParams.get("next");
      const nextPath = (() => {
        if (!nextParam) return "/";
        if (nextParam.startsWith("/")) return nextParam;
        try {
          const nextUrl = new URL(nextParam);
          if (nextUrl.origin === window.location.origin) {
            return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
          }
        } catch {
          // ignore
        }
        return "/";
      })();
      router.push(nextPath);
    } catch (err) {
      console.error("login failed", err);
      setError("登入失敗，請稍後重試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen w-full flex-col items-center justify-center p-4 group/design-root overflow-x-hidden"
      style={{ backgroundColor: "#f8f8f5" }}
    >
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center">
          <div className="h-20 w-auto">
            <img
              src="/logo/5.png"
              alt="LshWholesale"
              className="h-full w-auto object-contain"
            />
          </div>
        </div>

        <div className="flex w-full flex-col rounded-xl border border-gray-200/80 bg-white/80 p-8 shadow-lg backdrop-blur-sm">
          <h1 className="mb-6 text-center text-2xl font-extrabold text-[#111318]">
            會員登入
          </h1>

          <div className="mb-6 flex items-center justify-center">
            <Link href="/" className="text-sm text-gray-600 hover:underline">
              返回網站
            </Link>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                person
              </span>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-input flex h-12 w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-gray-300 bg-white/50 pl-10 pr-4 text-[#111318] placeholder:text-gray-400 focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                lock
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-input flex h-12 w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-gray-300 bg-white/50 pl-10 pr-12 text-[#111318] placeholder:text-gray-400 focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="button"
                aria-label="顯示/隱藏密碼"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <span className="material-symbols-outlined">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-700">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
                />
                記住我
              </label>
              <Link
                href={{
                  pathname: "/forgot-password",
                  query: searchParams.get("next")
                    ? { next: searchParams.get("next") as string }
                    : undefined,
                }}
                className="text-primary hover:underline"
              >
                忘記密碼？
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center rounded-lg bg-primary text-base font-bold text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "登入中..." : "登入"}
            </button>

            <p className="text-center text-sm text-gray-600">
              還沒有帳號？
              <a
                href="/register"
                className="ml-1 font-semibold text-primary hover:underline"
              >
                立即註冊
              </a>
            </p>
          </form>
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} LshWholesale ·
          <a href="#" className="ml-1 hover:underline">
            服務條款
          </a>
          <span className="mx-1">·</span>
          <a href="#" className="hover:underline">
            隱私政策
          </a>
        </div>
      </div>
    </div>
  );
}
