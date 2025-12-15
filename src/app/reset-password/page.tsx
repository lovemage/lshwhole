"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const hasAuthParams = useMemo(() => {
    const type = searchParams.get("type");
    const token = searchParams.get("token");
    const code = searchParams.get("code");
    return Boolean((type && token) || code);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        setLoading(true);
        setError("");

        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          if (!cancelled) setReady(true);
          return;
        }

        if (hasAuthParams) {
          const code = searchParams.get("code");
          if (code) {
            const { data, error: exchangeError } =
              await supabase.auth.exchangeCodeForSession(code);

            if (exchangeError || !data?.session) {
              if (!cancelled) {
                setError("重設連結無效或已過期，請重新申請。");
              }
              return;
            }

            if (!cancelled) setReady(true);
            return;
          }

          const hash = typeof window !== "undefined" ? window.location.hash : "";
          const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            const { data, error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (setSessionError || !data?.session) {
              if (!cancelled) {
                setError("重設連結無效或已過期，請重新申請。");
              }
              return;
            }

            if (!cancelled) setReady(true);
            return;
          }

          if (!cancelled) {
            setError("重設連結無效或已過期，請重新申請。");
          }
          return;
        }

        if (!cancelled) {
          setError("缺少重設資訊，請從 Email 連結進入。");
        }
      } catch {
        if (!cancelled) setError("初始化失敗，請稍後重試");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, [hasAuthParams, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("密碼至少 8 碼");
      return;
    }

    if (password !== confirmPassword) {
      setError("密碼不相符");
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      await supabase.auth.signOut();
      router.push("/login?reset=1");
    } catch {
      setError("重設失敗，請稍後重試");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen w-full flex-col items-center justify-center p-4"
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
            重設密碼
          </h1>

          {loading && (
            <div className="text-center text-sm text-gray-600">載入中...</div>
          )}

          {!loading && error && (
            <div className="mb-4 rounded-lg border border-red-400 bg-red-100 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && ready && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  lock
                </span>
                <input
                  type="password"
                  placeholder="新密碼（至少 8 碼）"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="form-input flex h-12 w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-gray-300 bg-white/50 pl-10 pr-4 text-[#111318] placeholder:text-gray-400 focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="relative">
                <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  lock
                </span>
                <input
                  type="password"
                  placeholder="確認新密碼"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="form-input flex h-12 w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-gray-300 bg-white/50 pl-10 pr-4 text-[#111318] placeholder:text-gray-400 focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex h-12 w-full items-center justify-center rounded-lg bg-primary text-base font-bold text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "送出中..." : "更新密碼"}
              </button>

              <p className="text-center text-sm text-gray-600">
                <a href="/login" className="font-semibold text-primary hover:underline">
                  返回登入
                </a>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
