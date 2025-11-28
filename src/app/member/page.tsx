"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useMemberPermissions } from "@/lib/memberPermissions";

interface OrderItem {
  id: number;
  qty: number;
  unit_price_twd: number;
  status: string;
  refund_amount: number;
  shipping_fee_intl: number;
  shipping_fee_domestic: number;
  box_fee: number;
  shipping_method: string;
  member_shipping_code: string;
  shipping_paid: boolean;
  product: {
    title_zh: string;
    title_original: string;
    sku: string;
    images: string[];
  };
}

interface Order {
  id: number;
  created_at: string;
  total_twd: number;
  status: string;
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  tracking_number: string | null;
  shipping_method: string | null;
  shipping_fee_intl: number;
  box_fee: number;
  order_items: OrderItem[];
  user_email?: string;
  user_display_name?: string;
  shipping_paid: boolean;
}

interface ProfileInfo {
  email: string | null;
  display_name: string | null;
  phone: string | null;
  delivery_address: string | null;
  tier: "retail" | "wholesale" | "vip" | null;
  wholesale_upgrade_requested_at: string | null;
  wholesale_upgrade_status: "NONE" | "PENDING" | "APPROVED" | "REJECTED" | null;
}

interface WalletInfo {
  balance_twd: number;
}

interface UpgradeSettings {
  rules_text: string | null;
  bank_account_info: string | null;
  agent_fee_twd: number | null;
  line_link: string | null;
}

const DEFAULT_AGENT_FEE = 6000;

export default function MemberPage() {
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [upgradeSettings, setUpgradeSettings] = useState<UpgradeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgradeSubmitting, setUpgradeSubmitting] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: "",
    phone: "",
    delivery_address: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);

  // Top-up State
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpForm, setTopUpForm] = useState({ amount: "", bankLast5: "", proofImage: "" });
  const [topUpSubmitting, setTopUpSubmitting] = useState(false);
  const [topUpSuccess, setTopUpSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [activeOrderTab, setActiveOrderTab] = useState<"PROCESSING" | "COMPLETED" | "ALL">("PROCESSING");

  const router = useRouter();

  // 會員權限
  const { loading: permissionsLoading, error: permissionsError, data: permissions } = useMemberPermissions();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setProfile(null);
          setWallet(null);
          setUpgradeSettings(null);
          setError(null);
          return;
        }

        const upgradeSettingsPromise = fetch("/api/upgrade-settings")
          .then(async (res) => {
            if (!res.ok) return null;
            const json = await res.json().catch(() => null);
            return json?.data || null;
          })
          .catch(() => null);

        const [profileRes, walletRes, settingsData] = await Promise.all([
          supabase
            .from("profiles")
            .select(
              "email, display_name, phone, delivery_address, tier, wholesale_upgrade_requested_at, wholesale_upgrade_status"
            )
            .eq("user_id", user.id)
            .single(),
          supabase
            .from("wallets")
            .select("balance_twd")
            .eq("user_id", user.id)
            .maybeSingle(),
          upgradeSettingsPromise,
        ]);

        if (profileRes.error) {
          console.error("載入會員資料失敗", profileRes.error);
          setError("載入會員資料失敗");
          setProfile(null);
        } else {
          const p = profileRes.data as any;
          setProfile({
            email: p.email ?? null,
            display_name: p.display_name ?? null,
            phone: p.phone ?? null,
            delivery_address: p.delivery_address ?? null,
            tier: (p.tier as ProfileInfo["tier"]) ?? null,
            wholesale_upgrade_requested_at: p.wholesale_upgrade_requested_at ?? null,
            wholesale_upgrade_status:
              (p.wholesale_upgrade_status as ProfileInfo["wholesale_upgrade_status"]) ?? "NONE",
          });
          // Initialize edit form
          setEditForm({
            display_name: p.display_name ?? "",
            phone: p.phone ?? "",
            delivery_address: p.delivery_address ?? "",
          });
          setError(null);
        }

        const walletError = (walletRes as any)?.error;
        const walletData = (walletRes as any)?.data;

        if (walletError && (walletError.message || walletError.code)) {
          console.error("載入錢包餘額失敗", walletError);
        }

        setWallet({ balance_twd: walletData?.balance_twd ?? 0 });

        if (settingsData) {
          setUpgradeSettings({
            rules_text: settingsData.rules_text ?? null,
            bank_account_info: settingsData.bank_account_info ?? null,
            agent_fee_twd:
              typeof settingsData.agent_fee_twd === "number" ? settingsData.agent_fee_twd : null,
            line_link: settingsData.line_link ?? null,
          });
        } else {
          setUpgradeSettings(null);
        }
      } catch (e) {
        console.error("載入會員資料時發生錯誤", e);
        setError("載入會員資料時發生錯誤");
        setProfile(null);
        setWallet(null);
        setUpgradeSettings(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Fetch Orders
  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      const res = await fetch("/api/orders", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        throw new Error("載入訂單失敗");
      }

      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      setOrdersError("載入訂單失敗，請稍後再試");
    } finally {
      setOrdersLoading(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "PENDING": return "處理中";
      case "COMPLETED": return "處理完畢";
      case "CANCELLED": return "取消訂單";
      case "DISPUTE_PENDING": return "爭議待處理";
      default: return status;
    }
  };

  const getItemStatusText = (status: string) => {
    const map: any = {
      NORMAL: "國外配貨中",
      ALLOCATED: "國外配貨完成",
      IN_TRANSIT: "回台運輸中",
      ARRIVED: "商品抵台",
      SHIPPED: "商品寄出",
      DELIVERY_FAILED: "未收貨",
      RECEIVED: "已收貨",
      OUT_OF_STOCK: "缺貨/斷貨",
      PARTIAL_OOS: "部分缺貨"
    };
    return map[status] || "配貨中";
  };

  const getItemStatusColor = (status: string) => {
    switch (status) {
      case "ALLOCATED": return "text-green-600 bg-green-50 border-green-200";
      case "IN_TRANSIT": return "text-indigo-600 bg-indigo-50 border-indigo-200";
      case "ARRIVED": return "text-purple-600 bg-purple-50 border-purple-200";
      case "SHIPPED": return "text-blue-600 bg-blue-50 border-blue-200";
      case "RECEIVED": return "text-gray-600 bg-gray-50 border-gray-200";
      case "OUT_OF_STOCK": return "text-red-600 bg-red-50 border-red-200";
      case "PARTIAL_OOS": return "text-orange-600 bg-orange-50 border-orange-200";
      default: return "text-blue-600 bg-blue-50 border-blue-200"; // Normal/Processing
    }
  };

  const handlePayShipping = async (orderId: number) => {
    if (!confirm("確定要支付運費嗎？將從您的錢包扣款。")) return;

    try {
      setOrdersLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const res = await fetch(`/api/orders/${orderId}/pay-shipping`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "支付失敗");
        fetchOrders(); // Reload to reflect state just in case
        return;
      }

      alert("支付成功！");
      // Reload wallet balance as well
      window.location.reload(); 
    } catch (e) {
      console.error("Pay shipping failed:", e);
      alert("支付失敗，請稍後再試");
    } finally {
      setOrdersLoading(false);
    }
  };

  const handlePayItemShipping = async (orderId: number, itemIds: number[]) => {
    if (!confirm(`確定要支付選取商品的運費嗎？將從您的錢包扣款。`)) return;

    try {
      setOrdersLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const res = await fetch(`/api/orders/${orderId}/pay-item-shipping`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ item_ids: itemIds }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "支付失敗");
        fetchOrders();
        return;
      }

      alert("支付成功！");
      window.location.reload();
    } catch (e) {
      console.error("Pay item shipping failed:", e);
      alert("支付失敗，請稍後再試");
    } finally {
      setOrdersLoading(false);
    }
  };

  const updateShippingCode = async (orderId: number, itemId: number, code: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/orders/${orderId}/items/${itemId}/shipping-code`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ shipping_code: code }),
      });

      if (!res.ok) {
        alert("更新失敗");
      }
    } catch (e) {
      console.error("Update shipping code failed:", e);
    }
  };

  const handleTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topUpForm.amount || !topUpForm.bankLast5 || !topUpForm.proofImage) return;
    
    try {
      setTopUpSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/member/topup-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          amount_twd: parseInt(topUpForm.amount),
          bank_account_last_5: topUpForm.bankLast5,
          proof_image: topUpForm.proofImage,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "提交失敗");
        return;
      }

      setTopUpSuccess(true);
    } catch (err) {
      console.error(err);
      alert("提交失敗");
    } finally {
      setTopUpSubmitting(false);
    }
  };

  // 升級為 Retail 會員
  const handleUpgradeToRetail = async () => {
    if (!permissions || permissions.tier !== 'guest') return;

    try {
      setUpgradeSubmitting(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError("請先登入");
        return;
      }

      const res = await fetch("/api/member/upgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ target_tier: "retail" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "升級失敗");
        return;
      }

      setUpgradeSuccess(true);
      setError(null);

      // 重新載入頁面以更新會員資料
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e) {
      console.error("升級申請發生錯誤", e);
      setError("升級申請發生錯誤，請稍後再試");
    } finally {
      setUpgradeSubmitting(false);
    }
  };

  // 升級為 Wholesale 會員
  const handleUpgradeToWholesale = async () => {
    if (!permissions || permissions.tier !== 'retail') return;

    if (!confirm("確認要扣除 6,000 元代理費並升級為批發會員嗎？")) {
      return;
    }

    try {
      setUpgradeSubmitting(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError("請先登入");
        return;
      }

      const res = await fetch("/api/member/upgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ target_tier: "wholesale" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "升級失敗");
        return;
      }

      setUpgradeSuccess(true);
      setError(null);

      // 重新載入頁面以更新會員資料
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e) {
      console.error("升級申請發生錯誤", e);
      setError("升級申請發生錯誤，請稍後再試");
    } finally {
      setUpgradeSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("登出失敗", e);
    } finally {
      setProfile(null);
      setWallet(null);
      setUpgradeSettings(null);
      setError(null);
      setUpgradeSuccess(false);
      router.push("/");
    }
  };

  const handleSaveProfile = async () => {
    try {
      setProfileSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(editForm),
      });

      if (!res.ok) {
        alert("更新失敗");
        return;
      }

      const updatedProfile = await res.json();
      setProfile((prev) => prev ? ({ ...prev, ...updatedProfile }) : null);
      setIsEditingProfile(false);
      alert("更新成功");
    } catch (e) {
      console.error("Update profile failed:", e);
      alert("更新失敗，請稍後再試");
    } finally {
      setProfileSaving(false);
    }
  };

  const getUpgradeAgentFee = () => {
    if (typeof upgradeSettings?.agent_fee_twd === "number" && upgradeSettings.agent_fee_twd > 0) {
      return upgradeSettings.agent_fee_twd;
    }
    return DEFAULT_AGENT_FEE;
  };


  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex min-h-80 items-center justify-center">
          <p className="text-gray-600 text-lg">載入中...</p>
        </div>
      );
    }

    if (!profile) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 min-h-80">
          <p className="text-gray-700 text-base">請先登入後再查看會員中心。</p>
          <div className="flex gap-3">
            <Link
              href="/login"
              className="px-4 py-2 bg-primary text-white text-sm font-bold hover:bg-primary/90"
            >
              前往登入
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-bold hover:bg-gray-300"
            >
              註冊帳號
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <section>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">會員中心</h1>
          <p className="text-sm text-gray-600">
            查看您的基本資料、儲值金餘額與會員權益。
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="border bg-white p-4">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-lg font-semibold text-gray-900">儲值金餘額</h2>
              <Link
                href="/member/topup-history"
                className="text-sm text-primary hover:underline"
              >
                查看記錄
              </Link>
            </div>
            <p className="text-sm text-gray-600 mb-1">目前可用金額</p>
                <div className="flex justify-between items-end">
                  <p className="text-3xl font-bold text-primary">
                    NT$ {wallet?.balance_twd ?? 0}
                  </p>
                  <button
                    onClick={() => {
                      setIsTopUpModalOpen(true);
                      setTopUpSuccess(false);
                      setTopUpForm({ amount: "", bankLast5: "", proofImage: "" });
                    }}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded hover:bg-green-700 transition-colors"
                  >
                    儲值
                  </button>
                </div>
          </div>

          <div className="border bg-white p-4">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-lg font-semibold text-gray-900">會員資訊</h2>
              {!isEditingProfile ? (
                <button 
                  onClick={() => setIsEditingProfile(true)}
                  className="text-sm text-primary hover:underline"
                >
                  修改收件資料 <span className="text-xs text-gray-500 font-normal ml-1">(注意! Email無法修改)</span>
                </button>
              ) : (
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setIsEditingProfile(false);
                      // Reset form
                      setEditForm({
                        display_name: profile.display_name || "",
                        phone: profile.phone || "",
                        delivery_address: profile.delivery_address || "",
                      });
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                    disabled={profileSaving}
                  >
                    取消
                  </button>
                  <button 
                    onClick={handleSaveProfile}
                    className="text-sm text-primary font-bold hover:text-primary/80"
                    disabled={profileSaving}
                  >
                    {profileSaving ? "儲存中..." : "儲存"}
                  </button>
                </div>
              )}
            </div>
            
            {!isEditingProfile ? (
              <div className="space-y-1 text-sm text-gray-700">
                <p>姓名 / 公司：{profile.display_name || "-"}</p>
                <p>Email：{profile.email || "-"}</p>
                <p>手機：{profile.phone || "-"}</p>
                <p>寄送地址：{profile.delivery_address || "-"}</p>
                <p>
                  會員等級：
                  {profile.tier === "vip"
                    ? "VIP 會員"
                    : profile.tier === "wholesale"
                    ? "批發會員"
                    : "零售會員"}
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div>
                  <label className="block text-gray-600 mb-1">姓名 / 公司</label>
                  <input 
                    type="text" 
                    value={editForm.display_name}
                    onChange={(e) => setEditForm({...editForm, display_name: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 mb-1">Email (不可修改)</label>
                  <input 
                    type="text" 
                    value={profile.email || ""}
                    disabled
                    className="w-full border border-gray-200 bg-gray-50 rounded px-3 py-2 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 mb-1">手機</label>
                  <input 
                    type="text" 
                    value={editForm.phone}
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 mb-1">寄送地址</label>
                  <textarea 
                    value={editForm.delivery_address}
                    onChange={(e) => setEditForm({...editForm, delivery_address: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    rows={2}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Guest → Retail 升級頁面 */}
        {permissions?.tier === 'guest' && permissions?.permissions.upgrade_available && (
          <section className="border bg-white p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              升級為 Retail 會員
            </h2>
            <p className="text-sm text-gray-700 mb-3">
              升級為 Retail 會員後，您可以查看商品價格並進行購買。
            </p>

            <div className="border-t border-gray-200 pt-3 mt-3 space-y-2">
              <h3 className="text-sm font-semibold text-gray-900">升級條件</h3>
              <p className="text-sm text-gray-700">
                儲值金 ≥ {permissions.permissions.upgrade_requirements?.min_wallet_balance || 1500} 元
              </p>
              <p className="text-xs text-gray-600">
                目前儲值金：NT$ {wallet?.balance_twd ?? 0}
              </p>
            </div>

            <div className="border-t border-gray-200 pt-3 mt-3 space-y-2">
              <h3 className="text-sm font-semibold text-gray-900">維持資格</h3>
              <p className="text-sm text-gray-700">
                45 日內需消費滿 300 元以維持 Retail 資格
              </p>
              <p className="text-sm text-red-600 font-semibold">
                ⚠️ 未達標會關閉登入權限
              </p>
              <p className="text-xs text-gray-600">
                關閉後顯示：「系統無偵測到每月訂單，請聯繫管理員」
              </p>
            </div>

            <div className="mt-4">
              {error && (
                <p className="mb-2 text-sm text-red-700">{error}</p>
              )}
              <button
                type="button"
                onClick={handleUpgradeToRetail}
                disabled={upgradeSubmitting || (wallet?.balance_twd ?? 0) < (permissions.permissions.upgrade_requirements?.min_wallet_balance || 1500)}
                className="px-4 py-2 bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {upgradeSubmitting ? "升級中..." : "申請升級為 Retail 會員"}
              </button>
              {upgradeSuccess && (
                <p className="mt-2 text-sm text-green-700">
                  升級成功！頁面即將重新載入...
                </p>
              )}
            </div>
          </section>
        )}

        {/* Retail → Wholesale 升級頁面 */}
        {permissions?.tier === 'retail' && permissions?.permissions.upgrade_available && (
          <section className="border bg-white p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              升級為 Wholesale 會員
            </h2>
            <p className="text-sm text-gray-700 mb-3">
              升級後可解鎖專屬批發方案與服務，由 LSH 協助您更有效率地完成跨國採購與集運。
            </p>
            <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1 mb-4">
              <li>最優惠海外商品廠商直連價格</li>
              <li>最新海外商品型錄，萬種商品一手掌握</li>
              <li>批發會員專屬服務群組，一對一協助報價與採購</li>
            </ul>

            <div className="border-t border-gray-200 pt-3 mt-3 space-y-2">
              <h3 className="text-sm font-semibold text-gray-900">升級條件</h3>
              <p className="text-sm text-gray-700">
                儲值金 ≥ 5,000 元
              </p>
              <p className="text-sm text-gray-700">
                代理費 6,000 元（從錢包扣除）
              </p>
              <p className="text-xs text-gray-600">
                總共需要至少 11,000 元
              </p>
              <p className="text-xs text-gray-600">
                目前儲值金：NT$ {wallet?.balance_twd ?? 0}
              </p>
            </div>

            <div className="border-t border-gray-200 pt-3 mt-3 space-y-2">
              <h3 className="text-sm font-semibold text-gray-900">維持資格</h3>
              <p className="text-sm text-gray-700">
                45 日內需消費滿 300 元以維持 Wholesale 資格
              </p>
              <p className="text-sm text-red-600 font-semibold">
                ⚠️ 未達標會關閉登入權限
              </p>
              <p className="text-xs text-gray-600">
                關閉後顯示：「系統無偵測到每月訂單，請聯繫管理員」
              </p>
            </div>

            <div className="mt-4">
              {error && (
                <p className="mb-2 text-sm text-red-700">{error}</p>
              )}
              <button
                type="button"
                onClick={handleUpgradeToWholesale}
                disabled={upgradeSubmitting || (wallet?.balance_twd ?? 0) < 11000}
                className="px-4 py-2 bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {upgradeSubmitting ? "升級中..." : "申請升級為 Wholesale 會員"}
              </button>
              {upgradeSuccess && (
                <p className="mt-2 text-sm text-green-700">
                  升級成功！頁面即將重新載入...
                </p>
              )}
            </div>
          </section>
        )}

        {/* 購買紀錄 Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">購買紀錄</h2>
            <div className="flex gap-2 text-sm">
              <button
                onClick={() => setActiveOrderTab("PROCESSING")}
                className={`px-3 py-1 rounded-full border ${
                  activeOrderTab === "PROCESSING"
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                處理中
              </button>
              <button
                onClick={() => setActiveOrderTab("COMPLETED")}
                className={`px-3 py-1 rounded-full border ${
                  activeOrderTab === "COMPLETED"
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                已完成
              </button>
              <button
                onClick={() => setActiveOrderTab("ALL")}
                className={`px-3 py-1 rounded-full border ${
                  activeOrderTab === "ALL"
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                全部
              </button>
            </div>
          </div>
          
          {ordersLoading && orders.length === 0 ? (
            <div className="text-center py-8 bg-white border border-gray-200">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-gray-600">載入訂單中...</p>
            </div>
          ) : ordersError ? (
            <div className="text-center py-8 bg-white border border-gray-200">
              <p className="text-red-600 mb-4">{ordersError}</p>
              <button onClick={fetchOrders} className="px-4 py-2 bg-primary text-white rounded-lg">重試</button>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-600 mb-4">目前沒有訂單</p>
              <Link href="/products" className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90">
                去購物
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {orders
                .filter(order => {
                  if (activeOrderTab === "ALL") return true;
                  if (activeOrderTab === "PROCESSING") return ["PENDING", "DISPUTE_PENDING"].includes(order.status);
                  if (activeOrderTab === "COMPLETED") return ["COMPLETED", "CANCELLED", "REFUNDED"].includes(order.status);
                  return true;
                })
                .map((order) => (
                <div key={order.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  {/* Order Header */}
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex flex-wrap justify-between items-center gap-4">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">訂單編號 #{order.id}</div>
                      <div className="text-sm text-gray-900 font-medium">
                        {new Date(order.created_at).toLocaleString("zh-TW")}
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <div className="text-sm text-gray-500">訂單狀態</div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        order.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                        order.status === "COMPLETED" ? "bg-green-100 text-green-800" :
                        order.status === "CANCELLED" ? "bg-gray-100 text-gray-800" :
                        order.status === "DISPUTE_PENDING" ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {getStatusText(order.status)}
                      </span>
                      {order.shipping_paid && (
                        <span className="text-xs text-green-600 font-medium">已支付補運費</span>
                      )}
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="divide-y divide-gray-100">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="p-6 flex flex-col sm:flex-row gap-4 sm:items-center">
                        {/* Product Image */}
                        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                          {item.product.images?.[0] ? (
                            <img src={item.product.images[0].replace(/^http:/, 'https:')} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <span className="material-symbols-outlined">image</span>
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                            {item.product.title_zh || item.product.title_original}
                          </h3>
                          <p className="text-xs text-gray-500 mb-2">SKU: {item.product.sku}</p>
                          <div className="flex items-baseline gap-4 text-sm">
                            <span className="text-gray-900">NT$ {item.unit_price_twd}</span>
                            <span className="text-gray-500">x {item.qty}</span>
                          </div>
                        </div>

                        {/* Item Status & Shipping */}
                        <div className="sm:text-right min-w-[200px] flex flex-col items-end gap-2">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getItemStatusColor(item.status)}`}>
                            {getItemStatusText(item.status)}
                          </span>
                          {item.refund_amount > 0 && (
                            <div className="text-xs text-red-600 font-medium">
                              已退 NT$ {item.refund_amount}
                            </div>
                          )}
                          
                          {/* Item Level Shipping Display */}
                          <div className="w-full flex flex-col items-end gap-1 mt-2 border-t pt-2">
                            {/* 賣貨便單號回填 */}
                            {item.shipping_method === 'WHOLESALE_STORE' && (
                              <div className="w-full mb-2">
                                <label className="text-xs text-gray-500 block mb-1 text-left">賣貨便寄件編號</label>
                                <div className="flex gap-1">
                                  <input 
                                    type="text" 
                                    defaultValue={item.member_shipping_code || ''}
                                    placeholder="輸入寄件編號"
                                    className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                                    onBlur={(e) => updateShippingCode(order.id, item.id, e.target.value)}
                                  />
                                </div>
                              </div>
                            )}

                            {/* 運費明細 */}
                            {((item.shipping_fee_intl || 0) + (item.shipping_fee_domestic || 0) + (item.box_fee || 0)) > 0 && (
                              <div className="text-right w-full bg-gray-50 p-2 rounded text-xs text-gray-600 space-y-1">
                                <div>國際運費: NT$ {item.shipping_fee_intl || 0}</div>
                                <div>國內運費: NT$ {item.shipping_fee_domestic || 0}</div>
                                <div>包材費: NT$ {item.box_fee || 0}</div>
                                <div className="font-bold text-gray-900 pt-1 border-t border-gray-200">
                                  總運費: NT$ {(item.shipping_fee_intl || 0) + (item.shipping_fee_domestic || 0) + (item.box_fee || 0)}
                                </div>
                                <div className="mt-2 flex justify-end">
                                  {item.shipping_paid ? (
                                    <span className="text-green-600 font-bold border border-green-200 bg-green-50 px-2 py-1 rounded">已付運費</span>
                                  ) : (
                                    <button
                                      onClick={() => handlePayItemShipping(order.id, [item.id])}
                                      className="px-3 py-1 bg-primary text-white font-bold rounded hover:bg-primary/90 transition-colors"
                                    >
                                      支付運費
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order Footer */}
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm text-gray-600 space-y-1">
                        {order.shipping_method && <div>運送方式: {order.shipping_method}</div>}
                        {order.tracking_number && <div>單號: {order.tracking_number}</div>}
                        {/* 提示支付運費: 當有運費產生且尚未支付時顯示 */}
                        {((order.shipping_fee_intl > 0 || order.box_fee > 0) && !order.shipping_paid) && (
                          <div className="text-orange-600 font-medium">
                            <p>請支付補運費以安排出貨</p>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500 mb-1">商品金額: NT$ {order.total_twd.toLocaleString()}</div>
                        {(order.shipping_fee_intl > 0 || order.box_fee > 0) && (
                          <div className="text-sm text-gray-500 mb-1">
                            補運費: NT$ {((order.shipping_fee_intl || 0) + (order.box_fee || 0)).toLocaleString()}
                            <span className="text-xs text-gray-400 ml-1">
                              (國際運費 {order.shipping_fee_intl || 0} + 包材 {order.box_fee || 0})
                            </span>
                          </div>
                        )}
                        <div className="text-lg font-bold text-gray-900 mt-2">
                          總計 NT$ {(order.total_twd + (order.shipping_fee_intl || 0) + (order.box_fee || 0)).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Actions: 支付運費按鈕 */}
                    {((order.shipping_fee_intl > 0 || order.box_fee > 0) && !order.shipping_paid) && (
                      <div className="flex justify-end mt-4 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => handlePayShipping(order.id)}
                          className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 shadow-sm"
                        >
                          支付運費 NT$ {((order.shipping_fee_intl || 0) + (order.box_fee || 0)).toLocaleString()}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  };

  return (
    <div
      style={{ backgroundColor: "#f8f8f5" }}
      className="relative flex min-h-screen w-full flex-col overflow-x-hidden"
    >
      <header className="sticky top-0 z-50 w-full bg-white/80 border-b border-gray-200">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-10 py-3">
          <div className="flex items-center gap-3 text-gray-800">
            <Link href="/" className="flex items-center gap-3">
              <div className="size-6 text-primary">
                <svg
                  fill="none"
                  viewBox="0 0 48 48"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M44 11.2727C44 14.0109 39.8386 16.3957 33.69 17.6364C39.8386 18.877 44 21.2618 44 24C44 26.7382 39.8386 29.123 33.69 30.3636C39.8386 31.6043 44 33.9891 44 36.7273C44 40.7439 35.0457 44 24 44C12.9543 44 4 40.7439 4 36.7273C4 33.9891 8.16144 31.6043 14.31 30.3636C8.16144 29.123 4 26.7382 4 24C4 21.2618 8.16144 18.877 14.31 17.6364C8.16144 16.3957 4 14.0109 4 11.2727C4 7.25611 12.9543 4 24 4C35.0457 4 44 7.25611 44 11.2727Z"
                    fill="currentColor"
                  ></path>
                </svg>
              </div>
              <h2 className="text-gray-900 text-lg font-bold leading-tight tracking-[-0.015em]">
                LshWholesale
              </h2>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {profile ? (
              <>
                <span className="text-sm text-gray-700">
                  儲值金：
                  <span className="font-semibold">NT$ {wallet?.balance_twd ?? 0}</span>
                </span>
                <Link
                  href="/products"
                  className="flex min-w-[84px] items-center justify-center h-10 px-4 bg-gray-200 text-gray-800 text-sm font-bold hover:bg-gray-300"
                >
                  商品列表
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex min-w-[84px] items-center justify-center h-10 px-4 bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200"
                >
                  登出
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  className="flex min-w-[84px] items-center justify-center h-10 px-4 bg-primary text-white text-sm font-bold hover:bg-primary/90"
                >
                  註冊
                </Link>
                <Link
                  href="/login"
                  className="flex min-w-[84px] items-center justify-center h-10 px-4 bg-gray-200 text-gray-800 text-sm font-bold hover:bg-gray-300"
                >
                  登入
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
        {error && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {renderContent()}
      </main>

      {/* Top-up Modal */}
      {isTopUpModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4">申請儲值</h2>
            
            {!topUpSuccess ? (
              <form onSubmit={handleTopUpSubmit} className="space-y-4">
                <div className="p-4 bg-gray-50 rounded border text-sm text-gray-700 space-y-2">
                  <p className="font-bold text-red-600">注意事項：</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>匯款請用本人存簿匯款。</li>
                    <li>使用他人存簿匯款 Lsh 有權凍結並查證該筆款項真實來源。</li>
                  </ul>
                  {upgradeSettings?.bank_account_info && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="font-semibold text-gray-900 mb-1">匯款資訊：</p>
                      <pre className="whitespace-pre-wrap font-sans">{upgradeSettings.bank_account_info}</pre>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    儲值金額 (TWD)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={topUpForm.amount}
                    onChange={(e) => setTopUpForm({ ...topUpForm, amount: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="請輸入金額"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    匯款帳號後五碼
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    minLength={5}
                    value={topUpForm.bankLast5}
                    onChange={(e) => setTopUpForm({ ...topUpForm, bankLast5: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="請輸入後五碼"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    匯款憑證 (截圖或照片)
                  </label>
                  <div className="mt-1 flex flex-col gap-2">
                    {topUpForm.proofImage ? (
                      <div className="relative w-full aspect-video bg-gray-100 rounded overflow-hidden border border-gray-200">
                        <img 
                          src={topUpForm.proofImage.replace(/^http:/, 'https:')} 
                          alt="匯款憑證" 
                          className="w-full h-full object-contain" 
                        />
                        <button
                          type="button"
                          onClick={() => setTopUpForm({...topUpForm, proofImage: ""})}
                          className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700"
                        >
                          <span className="material-symbols-outlined text-sm block">close</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {isUploading ? (
                              <p className="text-sm text-gray-500">上傳中...</p>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-gray-400 text-3xl mb-2">cloud_upload</span>
                                <p className="text-sm text-gray-500">點擊上傳圖片</p>
                              </>
                            )}
                          </div>
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            disabled={isUploading}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              
                              try {
                                setIsUploading(true);
                                const formData = new FormData();
                                formData.append('file', file);
                                
                                const res = await fetch('/api/upload', {
                                  method: 'POST',
                                  body: formData
                                });
                                
                                if (res.ok) {
                                  const data = await res.json();
                                  setTopUpForm({...topUpForm, proofImage: data.url});
                                } else {
                                  alert('上傳失敗');
                                }
                              } catch (err) {
                                console.error(err);
                                alert('上傳發生錯誤');
                              } finally {
                                setIsUploading(false);
                              }
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsTopUpModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={topUpSubmitting || isUploading || !topUpForm.proofImage}
                    className="flex-1 px-4 py-2 bg-primary text-white font-bold rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {topUpSubmitting ? "提交中..." : "完成匯款"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <div className="text-green-600 text-5xl flex justify-center">
                  <span className="material-symbols-outlined text-5xl">check_circle</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">申請提交成功</h3>
                <p className="text-gray-600">
                  請點擊下方按鈕上傳匯款單據至官方 Line，<br />
                  管理員確認後將為您手動儲值。
                </p>
                
                <a
                  href={upgradeSettings?.line_link || "https://line.me/ti/p/@lshwholesale"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-3 bg-[#06C755] text-white font-bold rounded hover:bg-[#05b64d]"
                >
                  上傳匯款單 (前往 Line)
                </a>
                
                <button
                  type="button"
                  onClick={() => {
                    setIsTopUpModalOpen(false);
                    // Refresh data? Not strictly needed as it's pending.
                  }}
                  className="block w-full py-2 text-gray-500 hover:text-gray-700"
                >
                  關閉
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
