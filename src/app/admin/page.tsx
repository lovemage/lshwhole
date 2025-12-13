"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import DashboardHome from "@/components/admin/DashboardHome";
import AnnouncementManager from "@/components/admin/AnnouncementManager";
import CategoryManager from "@/components/admin/CategoryManager";
import TagManager from "@/components/admin/TagManager";
import CrawlerImport from "@/components/admin/CrawlerImport";
import ProductManager from "@/components/admin/ProductManager";
import MemberManager from "@/components/admin/MemberManager";
import UpgradeSettings from "@/components/admin/UpgradeSettings";
import OrderManager from "@/components/admin/OrderManager";
import HotProductManager from "@/components/admin/HotProductManager";
import LimitedTimeProductManager from "@/components/admin/LimitedTimeProductManager";
import SubAccountManager from "@/components/admin/SubAccountManager";
import BannerManager from "@/components/admin/BannerManager";
import ShippingSettings from "@/components/admin/ShippingSettings";
import EmailTemplateManager from "@/components/admin/EmailTemplateManager";
import SpecTemplateManager from "@/components/admin/SpecTemplateManager";
import BlogManager from "@/components/admin/BlogManager";

function AdminDashboard() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState("dashboard");
  const [currentUserPermissions, setCurrentUserPermissions] = useState<string[] | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);

  // Check permissions
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const { supabase } = await import("@/lib/supabase").then((m) => ({ supabase: m.supabase }));
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/login?next=/admin");
          return;
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          router.replace("/login?next=/admin");
          return;
        }

        const profileRes = await fetch("/api/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!profileRes.ok) {
          router.replace("/login?next=/admin");
          return;
        }

        const profile = await profileRes.json().catch(() => null);
        if (!(profile as any)?.is_admin) {
          router.replace("/");
          return;
        }

        setCurrentUserId(user.id);
        const res = await fetch("/api/admin/sub-accounts");
        if (res.ok) {
          const accounts = await res.json();
          const myAccount = accounts.find((acc: any) => acc.user_id === user.id);
          if (myAccount) {
            setCurrentUserPermissions(myAccount.permissions || []);
          } else {
            setCurrentUserPermissions(null);
          }
        }
      } catch (err) {
        console.error("Failed to check permissions:", err);
      } finally {
        setAuthChecked(true);
      }
    };
    checkPermissions();
  }, [router]);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeNav]);

  const renderContent = () => {
    switch (activeNav) {
      case "dashboard":
        return <DashboardHome />;
      case "announcements":
        return <AnnouncementManager />;
      case "categories":
        return <CategoryManager />;
      case "tags":
        return <TagManager />;
      case "spec_templates":
        return <SpecTemplateManager />;
      case "crawler":
        return <CrawlerImport />;
      case "products":
        return <ProductManager />;
      case "members":
        return <MemberManager />;
      case "upgrade_settings":
        return <UpgradeSettings />;
      case "orders":
        return <OrderManager />;
      case "hot_products":
        return <HotProductManager />;
      case "limited_time_products":
        return <LimitedTimeProductManager />;
      case "sub_accounts":
        return <SubAccountManager />;
      case "banners":
        return <BannerManager />;
      case "shipping_settings":
        return <ShippingSettings />;
      case "email_templates":
        return <EmailTemplateManager />;
      case "blog":
        return <BlogManager />;
      default:
        return null;
    }
  };

  if (!authChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-background-light">
        <p className="text-text-secondary-light">載入中...</p>
      </div>
    );
  }

  // Sub-accounts List
  if (activeNav === "sub_accounts") {
    return (
      <div className="flex h-screen bg-background-light">
        <AdminSidebar
          activeNav={activeNav}
          setActiveNav={setActiveNav}
          currentUserPermissions={currentUserPermissions}
        />
        <main className="flex-1 overflow-y-auto">
          <SubAccountManager />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background-light">
      <AdminSidebar
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        currentUserPermissions={currentUserPermissions}
      />

      {/* Main Content */}
      <main ref={mainRef} className="flex-1 overflow-y-auto">
        <AdminHeader activeNav={activeNav} />

        {/* Page Content */}
        <div className="p-6 md:p-10 overflow-y-auto">
          {/* Page Heading */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex flex-col gap-1">
              <p className="text-3xl font-bold text-text-primary-light">
                {activeNav === "announcements"
                  ? "公告管理"
                  : activeNav === "categories"
                    ? "分類管理"
                    : activeNav === "tags"
                      ? "標籤管理"
                      : activeNav === "crawler"
                        ? "爬蟲導入"
                      : activeNav === "members"
                        ? "會員管理"
                        : activeNav === "orders"
                          ? "訂單管理"
                          : activeNav === "upgrade_settings"
                            ? "批發升級申請資格設定"
                            : activeNav === "sub_accounts"
                              ? "子帳戶管理"
                              : activeNav === "products"
                                ? "商品管理"
                                : activeNav === "hot_products"
                                  ? "熱銷商品"
                                  : activeNav === "limited_time_products"
                                    ? "限時商品"
                                    : activeNav === "banners"
                                    ? "橫幅管理"
                                    : activeNav === "shipping_settings"
                                      ? "運費管理"
                                      : activeNav === "email_templates"
                                        ? "Email 模板"
                                        : activeNav === "blog"
                                          ? "部落格管理"
                                          : "儀表看板"}
              </p>
              <p className="text-base text-text-secondary-light">
                {activeNav === "announcements"
                  ? "管理和編輯公告內容"
                  : activeNav === "categories"
                    ? "管理商品分類（L1/L2/L3）"
                    : activeNav === "tags"
                      ? "管理商品標籤（品牌、屬性、活動）"
                      : activeNav === "crawler"
                        ? "上架前資料檢視與轉換（JSON / Excel 匯入、匯率換算、利潤率）"
                      : activeNav === "members"
                        ? "管理會員資料、會員資格與錢包儲值"
                        : activeNav === "orders"
                          ? "查看與管理會員訂單"
                          : activeNav === "hot_products"
                            ? "管理首頁與專區顯示的熱銷商品"
                            : activeNav === "limited_time_products"
                              ? "管理限定時間商品及其販售時間"
                              : activeNav === "upgrade_settings"
                              ? "管理會員升級為批發會員的申請資格、銀行帳號與代理費金額"
                              : activeNav === "sub_accounts"
                                ? "新增與管理後台子帳戶及其權限"
                                : activeNav === "products"
                                  ? "查看與編輯商品資訊"
                                  : activeNav === "banners"
                                    ? "管理首頁與商品頁橫幅"
                                    : activeNav === "shipping_settings"
                                      ? "設定運費費率"
                                      : activeNav === "email_templates"
                                        ? "編輯系統自動發送的 Email 內容"
                                        : activeNav === "blog"
                                          ? "管理海外新訊文章與 SEO 設定"
                                          : "歡迎回來，以下是您商店活動的摘要。"}
              </p>
            </div>
            {activeNav === "dashboard" && (
              <button className="flex h-10 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg bg-primary px-5 text-sm font-bold text-white">
                <span className="material-symbols-outlined">add</span>
                <span>建立報告</span>
              </button>
            )}
          </div>

          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default dynamic(() => Promise.resolve(AdminDashboard), { ssr: false });
