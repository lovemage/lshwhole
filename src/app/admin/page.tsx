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
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
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
        setCurrentUserEmail(user.email || null);
        const res = await fetch("/api/admin/sub-accounts", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
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

  return (
    <div className="flex h-screen bg-background-light">
      <AdminSidebar
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        currentUserPermissions={currentUserPermissions}
        currentUserEmail={currentUserEmail}
      />

      {/* Main Content */}
      <main ref={mainRef} className="flex-1 overflow-y-auto">
        <AdminHeader activeNav={activeNav} />

        {/* Page Content */}
        <div className="p-6 md:p-10 overflow-y-auto">
          {activeNav === "dashboard" && (
            <div className="flex justify-end mb-6">
              <button className="flex h-10 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg bg-primary px-5 text-sm font-bold text-white">
                <span className="material-symbols-outlined">add</span>
                <span>建立報告</span>
              </button>
            </div>
          )}

          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default dynamic(() => Promise.resolve(AdminDashboard), { ssr: false });
