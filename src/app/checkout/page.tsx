"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useMemberPermissions } from "@/lib/memberPermissions";

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

export default function CheckoutPage() {
  const router = useRouter();
  const [step, setStep] = useState<"shipping" | "payment" | "review">("shipping");
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "card">("wallet");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ email: string | null } | null>(null);

  // 會員權限
  const { loading: permissionsLoading, error: permissionsError, data: permissions } = useMemberPermissions();

  const [formData, setFormData] = useState({
    firstName: "", // 收件人姓名
    email: "",
    phone: "",
    address: "",
    cardName: "",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
  });

  useEffect(() => {
    const items = loadCartFromStorage();
    setCartItems(items);

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user ?? null;
        if (user) {
          setCurrentUser({ email: user.email ?? null });

          // 載入錢包餘額
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

          // 載入會員資料（收件資訊）
          const profileResponse = await fetch("/api/profile", {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            // 自動填入會員的收件資訊
            setFormData((prev) => ({
              ...prev,
              firstName: profileData.display_name || "",
              email: profileData.email || "",
              phone: profileData.phone || "",
              address: profileData.delivery_address || "",
            }));
          }
        } else {
          setCurrentUser(null);
          setWalletBalance(null);
        }
      } catch (e) {
        console.error("載入登入狀態失敗", e);
      }
    })();
  }, []);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = 0;
  const tax = Math.floor(subtotal * 0.05);
  const total = Math.floor(subtotal + shipping + tax);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (step === "shipping") {
      setStep("payment");
    } else if (step === "payment") {
      setStep("review");
    } else {
      // 提交訂單
      if (paymentMethod === "wallet") {
        await handleWalletPayment();
      } else {
        // 信用卡支付（暫未實作）
        alert("信用卡支付功能尚未實作");
      }
    }
  };

  const handleWalletPayment = async () => {
    if (!currentUser) {
      setError("請先登入");
      return;
    }

    // 檢查會員權限
    if (!permissions?.permissions.can_use_wallet) {
      setError("您的會員等級無法使用錢包支付，請升級會員");
      return;
    }

    if (walletBalance === null || walletBalance < total) {
      setError(`錢包餘額不足，需要 NT$${total}，目前餘額 NT$${walletBalance || 0}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("請先登入");
        return;
      }

      // 驗證收件資訊
      const recipientName = formData.firstName.trim();
      const shippingAddress = formData.address.trim();

      if (!recipientName || !formData.phone || !shippingAddress) {
        setError("請填寫完整的收件資訊");
        setIsSubmitting(false);
        return;
      }

      // 準備訂單項目
      const items = cartItems.map((item) => ({
        product_id: parseInt(item.id),
        qty: item.quantity,
      }));

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          items,
          recipient_name: recipientName,
          shipping_address: shippingAddress,
          phone: formData.phone,
          note: "",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "訂單創建失敗");
        return;
      }

      // 清空購物車
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(CART_STORAGE_KEY);
      }

      // 跳轉到訂單成功頁面
      alert(`訂單創建成功！訂單編號：${result.order_id}\n新餘額：NT$${result.new_balance}`);
      router.push("/");
    } catch (err) {
      console.error("提交訂單失敗", err);
      setError("提交訂單失敗，請稍後再試");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: "#f8f8f5" }} className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between whitespace-nowrap border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-3">
          <Link href="/" className="flex items-center gap-3 text-gray-800">
            <div className="size-6 text-primary">
              <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M44 11.2727C44 14.0109 39.8386 16.3957 33.69 17.6364C39.8386 18.877 44 21.2618 44 24C44 26.7382 39.8386 29.123 33.69 30.3636C39.8386 31.6043 44 33.9891 44 36.7273C44 40.7439 35.0457 44 24 44C12.9543 44 4 40.7439 4 36.7273C4 33.9891 8.16144 31.6043 14.31 30.3636C8.16144 29.123 4 26.7382 4 24C4 21.2618 8.16144 18.877 14.31 17.6364C8.16144 16.3957 4 14.0109 4 11.2727C4 7.25611 12.9543 4 24 4C35.0457 4 44 7.25611 44 11.2727Z" fill="currentColor"></path>
              </svg>
            </div>
            <h2 className="text-gray-900 text-lg font-bold leading-tight tracking-[-0.015em]">Lsx wholesale</h2>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto py-8 lg:py-12 px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          {/* Main Content */}
          <div className="w-full lg:w-3/5 xl:w-2/3 space-y-8">
            {/* Breadcrumbs */}
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Link href="/cart" className="text-gray-600 hover:text-primary text-sm font-medium leading-normal transition-colors">購物車</Link>
                <span className="text-gray-600 text-sm font-medium leading-normal">/</span>
                <span className="text-gray-900 text-sm font-medium leading-normal">結帳</span>
              </div>
              <h1 className="text-4xl font-black text-gray-900 leading-tight tracking-[-0.033em]">結帳</h1>
            </div>

            {/* Step Tabs */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
              {["shipping", "payment", "review"].map((s, i) => (
                <button
                  key={s}
                  onClick={() => setStep(s as any)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    step === s
                      ? "bg-white text-primary shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {i + 1}. {s === "shipping" ? "運送" : s === "payment" ? "支付" : "確認"}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Shipping Step */}
              {step === "shipping" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">運送資訊</h2>
                    {currentUser && (
                      <p className="text-sm text-gray-600 mt-2">
                        已自動載入您的預設收件資訊，您可以在此修改本次訂單的收件資訊。
                        如需更新預設資訊，請前往 <Link href="/profile" className="text-primary hover:underline">個人資料頁面</Link>。
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      收件人姓名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="請輸入收件人姓名"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        電子郵件 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="example@email.com"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        電話 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="0912345678"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      收件地址 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="請輸入完整的收件地址（例如：台北市信義區信義路五段7號）"
                      required
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
              )}

              {/* Payment Step */}
              {step === "payment" && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900">支付資訊</h2>

                  {/* 支付方式選擇 */}
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">選擇支付方式</label>

                    {/* 錢包支付 */}
                    {permissions?.permissions.can_use_wallet ? (
                      <div
                        onClick={() => setPaymentMethod("wallet")}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          paymentMethod === "wallet"
                            ? "border-primary bg-primary/5"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="paymentMethod"
                              checked={paymentMethod === "wallet"}
                              onChange={() => setPaymentMethod("wallet")}
                              className="w-4 h-4 text-primary"
                            />
                            <div>
                              <p className="font-semibold text-gray-900">錢包支付</p>
                              <p className="text-sm text-gray-600">
                                {currentUser ? (
                                  walletBalance !== null ? (
                                    <>
                                      目前餘額：NT${walletBalance}
                                      {walletBalance < total && (
                                        <span className="text-red-600 ml-2">（餘額不足）</span>
                                      )}
                                    </>
                                  ) : (
                                    "載入中..."
                                  )
                                ) : (
                                  "請先登入"
                                )}
                              </p>
                            </div>
                          </div>
                          <span className="text-2xl">💰</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 border-2 rounded-lg border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="paymentMethod"
                              disabled
                              className="w-4 h-4 text-gray-400"
                            />
                            <div>
                              <p className="font-semibold text-gray-500">錢包支付</p>
                              <p className="text-sm text-gray-500">升級會員後可用</p>
                            </div>
                          </div>
                          <span className="text-2xl opacity-50">💰</span>
                        </div>
                      </div>
                    )}

                    {/* 信用卡支付 */}
                    {permissions?.permissions.can_use_credit_card ? (
                      <div
                        onClick={() => setPaymentMethod("card")}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          paymentMethod === "card"
                            ? "border-primary bg-primary/5"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="paymentMethod"
                              checked={paymentMethod === "card"}
                              onChange={() => setPaymentMethod("card")}
                              className="w-4 h-4 text-primary"
                            />
                            <div>
                              <p className="font-semibold text-gray-900">信用卡支付</p>
                              <p className="text-sm text-gray-600">Visa、Mastercard、JCB</p>
                            </div>
                          </div>
                          <span className="text-2xl">💳</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 border-2 rounded-lg border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="paymentMethod"
                              disabled
                              className="w-4 h-4 text-gray-400"
                            />
                            <div>
                              <p className="font-semibold text-gray-500">信用卡支付</p>
                              <p className="text-sm text-gray-500">升級後可用</p>
                            </div>
                          </div>
                          <span className="text-2xl opacity-50">💳</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 信用卡表單（僅在選擇信用卡時顯示） */}
                  {paymentMethod === "card" && (
                    <div className="space-y-4 pt-4 border-t border-gray-200">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">持卡人姓名</label>
                        <input
                          type="text"
                          name="cardName"
                          value={formData.cardName}
                          onChange={handleInputChange}
                          placeholder="張三"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">卡號</label>
                        <input
                          type="text"
                          name="cardNumber"
                          value={formData.cardNumber}
                          onChange={handleInputChange}
                          placeholder="1234 5678 9012 3456"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">有效期</label>
                          <input
                            type="text"
                            name="expiryDate"
                            value={formData.expiryDate}
                            onChange={handleInputChange}
                            placeholder="MM/YY"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                          <input
                            type="text"
                            name="cvv"
                            value={formData.cvv}
                            onChange={handleInputChange}
                            placeholder="123"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Review Step */}
              {step === "review" && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900">訂單確認</h2>

                  {/* 購物車項目 */}
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <h3 className="font-semibold text-gray-900 mb-2">訂單項目</h3>
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.name} x {item.quantity}</span>
                        <span>NT${Math.floor(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  {/* 配送資訊 */}
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <h3 className="font-semibold text-gray-900 mb-2">配送資訊</h3>
                    <p><strong>收件人：</strong> {formData.firstName}</p>
                    <p><strong>電子郵件：</strong> {formData.email}</p>
                    <p><strong>電話：</strong> {formData.phone}</p>
                    <p><strong>地址：</strong> {formData.address}</p>
                  </div>

                  {/* 支付方式 */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">支付方式</h3>
                    <p>{paymentMethod === "wallet" ? "💰 錢包支付" : "💳 信用卡支付"}</p>
                  </div>
                </div>
              )}

              {/* 錯誤提示 */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-4">
                {step !== "shipping" && (
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setStep(step === "payment" ? "shipping" : "payment");
                    }}
                    disabled={isSubmitting}
                    className="flex-1 bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一步
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting || (step === "review" && paymentMethod === "wallet" && (walletBalance === null || walletBalance < total))}
                  className="flex-1 bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "處理中..." : step === "review" ? "確認訂單" : "下一步"}
                </button>
              </div>
            </form>
          </div>

          {/* Order Summary Sidebar */}
          <div className="w-full lg:w-2/5 xl:w-1/3">
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-fit sticky top-20">
              <h2 className="text-xl font-bold text-gray-900 mb-6">訂單摘要</h2>

              <div className="space-y-4 mb-6 pb-6 border-b border-gray-200">
                <div className="flex justify-between text-gray-600">
                  <span>小計</span>
                  <span>NT${Math.floor(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>運費</span>
                  <span className="text-green-600 font-semibold">免費</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>稅金 (5%)</span>
                  <span>NT${Math.floor(tax)}</span>
                </div>
              </div>

              <div className="flex justify-between text-lg font-bold text-gray-900 mb-6">
                <span>總計</span>
                <span>NT${Math.floor(total)}</span>
              </div>

              <Link href="/cart" className="text-primary hover:text-primary/80 text-sm font-medium transition-colors">
                ← 返回購物車
              </Link>
            </div>
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
            <p className="text-gray-600 text-sm">© {new Date().getFullYear()} Lsx 批發。版權所有。</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

