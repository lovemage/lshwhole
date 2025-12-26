"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export interface MemberPermissions {
  tier: string;
  tier_name: string;
  login_enabled: boolean;
  days_since_last_purchase: number | null;
  permissions: {
    tier: string;
    tier_name: string;
    can_view_products: boolean;
    can_view_hot_products: boolean;
    can_purchase: boolean;
    can_use_wallet: boolean;
    can_use_credit_card: boolean;
    price_type: "none" | "retail" | "wholesale";
    accessible_pages: string[];
    upgrade_available: boolean;
    upgrade_target: string | null;
    upgrade_requirements: Record<string, unknown> | null;
    allowed_l1_category_ids?: number[] | null;
    maintenance_requirements?: {
      days: number;
      min_amount: number;
      description: string;
    };
  };
}

export interface UseMemberPermissionsResult {
  loading: boolean;
  error: string | null;
  data: MemberPermissions | null;
}

/**
 * 共用 hook：取得目前登入會員的權限資訊
 */
export function useMemberPermissions(): UseMemberPermissionsResult {
  const [state, setState] = useState<UseMemberPermissionsResult>({
    loading: true,
    error: null,
    data: null,
  });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          if (!cancelled) {
            setState({ loading: false, error: null, data: null });
          }
          return;
        }

        const res = await fetch("/api/member/permissions", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const msg = body?.error || `載入會員權限失敗 (${res.status})`;
          if (!cancelled) {
            setState({ loading: false, error: msg, data: null });
          }
          return;
        }

        const data = (await res.json()) as MemberPermissions;
        if (!cancelled) {
          setState({ loading: false, error: null, data });
        }
      } catch (e) {
        console.error("load member permissions failed", e);
        if (!cancelled) {
          setState({
            loading: false,
            error: "載入會員權限失敗，請稍後再試",
            data: null,
          });
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

