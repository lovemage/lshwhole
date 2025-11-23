import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

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
          id, product_id, qty, unit_price_twd,
          products (
            sku, title_zh, title_original
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
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const list = orders || [];
    const userIds = list.map((o: any) => o.user_id).filter(Boolean);
    const productIds = list.flatMap((o: any) => o.order_items?.map((item: any) => item.product_id) || []).filter(Boolean);

    let profileMap = new Map<string, { email: string | null; display_name: string | null }>();
    let imageMap = new Map<number, string[]>();

    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("user_id, email, display_name")
        .in("user_id", userIds);

      profileMap = new Map(
        (profiles || []).map((p: any) => [p.user_id, { email: p.email, display_name: p.display_name }])
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
        imgs.forEach((img: any) => {
          if (!byProduct.has(img.product_id)) {
            byProduct.set(img.product_id, []);
          }
          byProduct.get(img.product_id)!.push({ url: img.url, sort: img.sort });
        });

        // Sort images by sort order and take URLs
        byProduct.forEach((images, productId) => {
          const sortedUrls = images
            .sort((a, b) => a.sort - b.sort)
            .map(img => img.url);
          imageMap.set(productId, sortedUrls);
        });
      }
    }

    const result = list.map((o: any) => {
      const profile = profileMap.get(o.user_id) || { email: null, display_name: null };

      // Add images to order items
      const orderItemsWithImages = o.order_items?.map((item: any) => ({
        ...item,
        product: {
          ...item.products,
          images: imageMap.get(item.product_id) || []
        }
      })) || [];

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
