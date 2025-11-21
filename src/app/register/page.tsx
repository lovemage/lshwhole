"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    phone: "",
    deliveryAddress: "",
    termsAccepted: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("密碼不相符");
      setLoading(false);
      return;
    }

    if (!formData.termsAccepted) {
      setError("請同意服務條款和隱私政策");
      setLoading(false);
      return;
    }

    try {
      // Sign up with Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (authData.user) {
        // Create profile record via API (uses service role)
        const profileRes = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: authData.user.id,
            email: formData.email,
            displayName: formData.displayName,
            phone: formData.phone,
            deliveryAddress: formData.deliveryAddress,
          }),
        });

        if (!profileRes.ok) {
          const profileData = await profileRes.json();
          setError("建立個人資料失敗：" + (profileData.error || "未知錯誤"));
          return;
        }

        // Redirect to login
        router.push("/login?registered=true");
      }
    } catch (err) {
      setError("註冊失敗，請稍後重試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center p-4" style={{ backgroundColor: '#f8f8f5' }}>
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 flex items-center justify-between whitespace-nowrap border-b border-solid border-gray-200 px-6 sm:px-10 py-3">
        <div className="flex items-center gap-4 text-gray-800">
          <div className="h-6 w-6 text-primary">
            <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M44 11.2727C44 14.0109 39.8386 16.3957 33.69 17.6364C39.8386 18.877 44 21.2618 44 24C44 26.7382 39.8386 29.123 33.69 30.3636C39.8386 31.6043 44 33.9891 44 36.7273C44 40.7439 35.0457 44 24 44C12.9543 44 4 40.7439 4 36.7273C4 33.9891 8.16144 31.6043 14.31 30.3636C8.16144 29.123 4 26.7382 4 24C4 21.2618 8.16144 18.877 14.31 17.6364C8.16144 16.3957 4 14.0109 4 11.2727C4 7.25611 12.9543 4 24 4C35.0457 4 44 7.25611 44 11.2727Z" fill="currentColor"></path>
            </svg>
          </div>
          <h2 className="text-lg font-bold tracking-[-0.015em]">Lsx Wholesale</h2>
        </div>
        <a href="/login" className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold tracking-[0.015em] hover:bg-primary/90 transition-colors">
          <span className="truncate">登入</span>
        </a>
      </header>

      <main className="w-full max-w-lg mx-auto py-20 px-4">
        <div className="flex flex-col gap-8">
          {/* Page Heading */}
          <div className="flex flex-col gap-3 text-center">
            <h1 className="text-gray-900 text-4xl font-black tracking-[-0.033em]">建立批發帳戶</h1>
            <p className="text-gray-600 text-base font-normal">享受來自韓國、日本和泰國的獨家批發價格。</p>
          </div>

          {/* Registration Form */}
          <div className="flex flex-col gap-6 bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-200">
            {error && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleRegister} className="flex flex-col gap-6">
              <div className="grid grid-cols-1 gap-6">
                {/* Email */}
                <label className="flex flex-col">
                  <p className="text-gray-900 text-sm font-medium pb-2">Email</p>
                  <input
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 bg-gray-50 focus:border-primary h-12 placeholder:text-gray-500 px-4 text-base font-normal"
                  />
                </label>

                {/* Display Name */}
                <label className="flex flex-col">
                  <p className="text-gray-900 text-sm font-medium pb-2">姓名</p>
                  <input
                    type="text"
                    name="displayName"
                    placeholder="您的全名"
                    value={formData.displayName}
                    onChange={handleChange}
                    required
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 bg-gray-50 focus:border-primary h-12 placeholder:text-gray-500 px-4 text-base font-normal"
                  />
                </label>

                {/* Phone */}
                <label className="flex flex-col">
                  <p className="text-gray-900 text-sm font-medium pb-2">電話</p>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="您的電話號碼"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 bg-gray-50 focus:border-primary h-12 placeholder:text-gray-500 px-4 text-base font-normal"
                  />
                </label>

                {/* Delivery Address */}
                <label className="flex flex-col">
                  <p className="text-gray-900 text-sm font-medium pb-2">收件地址</p>
                  <textarea
                    name="deliveryAddress"
                    placeholder="請輸入完整的收件地址"
                    value={formData.deliveryAddress}
                    onChange={handleChange}
                    required
                    rows={3}
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 bg-gray-50 focus:border-primary placeholder:text-gray-500 px-4 py-3 text-base font-normal"
                  />
                </label>

                {/* Password */}
                <label className="flex flex-col">
                  <p className="text-gray-900 text-sm font-medium pb-2">密碼</p>
                  <input
                    type="password"
                    name="password"
                    placeholder="輸入密碼"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 bg-gray-50 focus:border-primary h-12 placeholder:text-gray-500 px-4 text-base font-normal"
                  />
                </label>

                {/* Confirm Password */}
                <label className="flex flex-col">
                  <p className="text-gray-900 text-sm font-medium pb-2">確認密碼</p>
                  <input
                    type="password"
                    name="confirmPassword"
                    placeholder="再次輸入密碼"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 bg-gray-50 focus:border-primary h-12 placeholder:text-gray-500 px-4 text-base font-normal"
                  />
                </label>
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-start gap-3 pt-2">
                <input
                  type="checkbox"
                  id="terms"
                  name="termsAccepted"
                  checked={formData.termsAccepted}
                  onChange={handleChange}
                  className="form-checkbox h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary/50 bg-gray-50 mt-0.5"
                />
                <label className="text-sm text-gray-600" htmlFor="terms">
                  我同意 <a className="font-medium text-primary hover:underline" href="/terms-of-service">服務條款</a> 和 <a className="font-medium text-primary hover:underline" href="/privacy-policy">隱私政策</a>
                </label>
              </div>

              {/* Register Button */}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-4 bg-primary text-white text-base font-bold tracking-[0.015em] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="truncate">{loading ? "建立中..." : "建立帳戶"}</span>
              </button>
            </form>
          </div>

          {/* Login Link */}
          <p className="text-center text-sm text-gray-600">
            已有帳戶？ <a href="/login" className="font-bold text-primary hover:underline">登入</a>
          </p>
        </div>
      </main>
    </div>
  );
}

