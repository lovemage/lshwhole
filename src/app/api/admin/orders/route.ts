import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

interface OrderItemWithProduct {
  id: number;
  product_id: number;
  qty: number;
  unit_price_twd: number;
  spec_name: string | null;
  products: {
    sku: string | null;
    title_zh: string | null;
    title_original: string | null;
    original_url: string | null;
  } | { sku: string | null; title_zh: string | null; title_original: string | null; original_url: string | null; }[] | null;
}

interface OrderRow {
  id: number;
  user_id: string | null;
  status: string | null;
  total_twd: number | null;
  created_at: string;
  updated_at: string;
  hold_id: number | null;
  order_items: OrderItemWithProduct[] | null;
}

// 管理端：訂單列表
export async function GET(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const { searchParams } = new URL(request.url);

    const limit = Number(searchParams.get("limit") || "20");
    const offset = Number(searchParams.get("offset") || "0");
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";

    let query = admin
      .from("orders")
      .select(`
        id, user_id, status, total_twd, created_at, updated_at, hold_id,
        order_items (
          id, product_id, qty, unit_price_twd, spec_name,
          products (
            sku, title_zh, title_original, original_url
          )
        )
      `, {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }

    // 目前僅支援以訂單編號精確搜尋
    if (search) {
      const idNum = Number(search);
      if (!Number.isNaN(idNum)) {
        query = query.eq("id", idNum);
      }
    }

    const { data: orders, error, count } = await query;

    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json({ error: error.message, details: error }, { status: 400 });
    }

    const list: OrderRow[] = orders || [];
    const userIds = list.map((o) => o.user_id).filter(Boolean) as string[];
    const productIds = list
      .flatMap((o) => (o.order_items || []).map((item) => item.product_id))
      .filter((pid): pid is number => pid !== null && pid !== undefined);

    let profileMap = new Map<string, { email: string | null; display_name: string | null }>();
    const imageMap = new Map<number, string[]>();

    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("user_id, email, display_name")
        .in("user_id", userIds);

      profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, { email: p.email, display_name: p.display_name }])
      );
    }

    // Fetch product images
    if (productIds.length > 0) {
      const { data: imgs, error: imgErr } = await admin
        .from("product_images")
        .select("product_id, url, sort")
        .in("product_id", productIds)
        .order("sort", { ascending: true });

      if (!imgErr && imgs) {
        const byProduct = new Map<number, { url: string; sort: number }[]>();
        imgs.forEach((img) => {
          const listArr = byProduct.get(img.product_id) || [];
          listArr.push({ url: img.url, sort: img.sort });
          byProduct.set(img.product_id, listArr);
        });

        byProduct.forEach((images, productId) => {
          const sortedUrls = images
            .sort((a, b) => (a.sort || 0) - (b.sort || 0))
            .map((img) => img.url?.replace(/^http:\/\//i, "https://"))
            .filter((u): u is string => typeof u === "string" && u.length > 0);
          imageMap.set(productId, sortedUrls);
        });
      }
    }

    const result = list.map((o) => {
      const profile = o.user_id
        ? profileMap.get(o.user_id) || { email: null, display_name: null }
        : { email: null, display_name: null };

      const orderItemsWithImages = (o.order_items || []).map((item) => {
        const productData = Array.isArray(item.products) ? item.products[0] : item.products;
        return {
          ...item,
          product: {
            sku: productData?.sku ?? null,
            title_zh: productData?.title_zh ?? null,
            title_original: productData?.title_original ?? null,
            original_url: productData?.original_url ?? null,
            images: imageMap.get(item.product_id) || [],
          },
        };
      });

      return {
        ...o,
        user_email: profile.email,
        user_display_name: profile.display_name,
        order_items: orderItemsWithImages,
      };
    });

    return NextResponse.json({ data: result, count: count || 0 });
  } catch (err) {
    console.error("GET /api/admin/orders error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
