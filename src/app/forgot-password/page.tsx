"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const redirectTo = origin ? `${origin}/reset-password` : undefined;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        redirectTo ? { redirectTo } : undefined
      );

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSuccess(true);
    } catch {
      setError("送出失敗，請稍後重試");
    } finally {
      setLoading(false);
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
          <h1 className="mb-2 text-center text-2xl font-extrabold text-[#111318]">
            忘記密碼
          </h1>
          <p className="mb-6 text-center text-sm text-gray-600">
            請輸入註冊的 Email，我們會透過系統寄送重設密碼連結。
          </p>

          {error && (
            <div className="mb-4 rounded-lg border border-red-400 bg-red-100 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-lg border border-green-400 bg-green-100 p-3 text-sm text-green-800">
              若 Email 存在，重設連結已寄出（請檢查收件匣/垃圾郵件）。
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                mail
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

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center rounded-lg bg-primary text-base font-bold text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "送出中..." : "寄送重設連結"}
            </button>

            <p className="text-center text-sm text-gray-600">
              想起密碼了？
              <a href="/login" className="ml-1 font-semibold text-primary hover:underline">
                返回登入
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
