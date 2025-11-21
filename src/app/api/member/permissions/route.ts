import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/member/permissions
 * 查詢會員權限資訊
 * 回傳：會員等級、可訪問頁面、可用付款方式、登入權限狀態
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!authHeader?.startsWith("Bearer ") || !supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "未登入或憑證無效" }, { status: 401 });
    }

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const admin = supabaseAdmin();

    // 查詢會員資料
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("user_id, email, display_name, tier, login_enabled, login_disabled_at, login_disabled_reason, last_purchase_date")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "找不到會員資料" }, { status: 404 });
    }

    // 根據會員等級定義權限
    const permissions = getPermissionsByTier(profile.tier);

    // 計算距離上次消費的天數
    let daysSinceLastPurchase = null;
    if (profile.last_purchase_date) {
      const lastPurchase = new Date(profile.last_purchase_date);
      const now = new Date();
      daysSinceLastPurchase = Math.floor((now.getTime() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24));
    }

    return NextResponse.json({
      user_id: profile.user_id,
      email: profile.email,
      display_name: profile.display_name,
      tier: profile.tier,
      login_enabled: profile.login_enabled,
      login_disabled_at: profile.login_disabled_at,
      login_disabled_reason: profile.login_disabled_reason,
      last_purchase_date: profile.last_purchase_date,
      days_since_last_purchase: daysSinceLastPurchase,
      permissions,
    });

  } catch (err) {
    console.error("GET /api/member/permissions error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * 根據會員等級回傳權限設定
 */
function getPermissionsByTier(tier: string) {
  const basePermissions = {
    tier,
    tier_name: getTierName(tier),
    can_view_products: false,
    can_view_hot_products: true, // 所有會員都可以看熱銷商品
    can_purchase: false,
    can_use_wallet: false,
    can_use_credit_card: false,
    price_type: 'none' as 'none' | 'retail' | 'wholesale',
    accessible_pages: [] as string[],
    upgrade_available: false,
    upgrade_target: null as string | null,
    upgrade_requirements: null as any,
  };

  switch (tier) {
    case 'guest':
      return {
        ...basePermissions,
        can_view_hot_products: true,
        accessible_pages: ['/hot-products', '/member'],
        upgrade_available: true,
        upgrade_target: 'retail',
        upgrade_requirements: {
          min_wallet_balance: 1500,
          description: '儲值 1,500 元即可升級為 Retail 會員',
        },
      };

    case 'retail':
      return {
        ...basePermissions,
        can_view_products: true,
        can_purchase: true,
        can_use_wallet: true,
        price_type: 'retail' as const,
        accessible_pages: ['/products', '/hot-products', '/cart', '/checkout', '/member', '/orders'],
        upgrade_available: true,
        upgrade_target: 'wholesale',
        upgrade_requirements: {
          min_wallet_balance: 11000, // 5000 儲值 + 6000 代理費
          agency_fee: 6000,
          description: '儲值 5,000 元 + 代理費 6,000 元即可升級為 Wholesale 會員',
        },
        maintenance_requirements: {
          days: 45,
          min_amount: 300,
          description: '45 日內需消費滿 300 元以維持 Retail 資格',
        },
      };

    case 'wholesale':
      return {
        ...basePermissions,
        can_view_products: true,
        can_purchase: true,
        can_use_wallet: true,
        price_type: 'wholesale' as const,
        accessible_pages: ['/products', '/hot-products', '/cart', '/checkout', '/member', '/orders'],
        upgrade_available: false,
        maintenance_requirements: {
          days: 45,
          min_amount: 300,
          description: '45 日內需消費滿 300 元以維持 Wholesale 資格',
        },
      };

    case 'vip':
      return {
        ...basePermissions,
        can_view_products: true,
        can_purchase: true,
        can_use_wallet: true,
        can_use_credit_card: true,
        price_type: 'wholesale' as const,
        accessible_pages: ['/products', '/hot-products', '/cart', '/checkout', '/member', '/orders', '/admin'],
        upgrade_available: false,
      };

    default:
      return basePermissions;
  }
}

/**
 * 取得會員等級中文名稱
 */
function getTierName(tier: string): string {
  const tierNames: Record<string, string> = {
    guest: 'Guest 會員',
    retail: 'Retail 會員',
    wholesale: 'Wholesale 會員',
    vip: 'VIP 會員',
  };
  return tierNames[tier] || tier;
}

