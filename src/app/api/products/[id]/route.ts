import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = supabaseAdmin();

    // 解析目前會員 tier，用來決定是否顯示批發價
    let userTier: "retail" | "wholesale" | "vip" | null = null;
    const authHeader =
      request.headers.get("Authorization") || request.headers.get("authorization");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (authHeader?.startsWith("Bearer ") && supabaseUrl && supabaseAnonKey) {
      try {
        const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: {
              Authorization: authHeader,
            },
          },
        });

        const {
          data: { user },
        } = await supabaseUser.auth.getUser();

        if (user) {
          const { data: profile, error: profileErr } = await admin
            .from("profiles")
            .select("tier")
            .eq("user_id", user.id)
            .single();

          if (!profileErr && profile?.tier) {
            userTier = profile.tier as "retail" | "wholesale" | "vip";
          }
        }
      } catch (e) {
        console.error("resolve user tier failed in /api/products/[id]", e);
      }
    }

    const isWholesaleTier = userTier === "wholesale" || userTier === "vip";

    const { id } = await params;

    // 獲取商品基本資料（不包含成本價）
    const { data: product, error } = await admin
      .from("products")
      .select(
        "id, sku, title_zh, title_original, desc_zh, desc_original, retail_price_twd, wholesale_price_twd, status, created_at, updated_at, specs"
      )
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 獲取商品圖片
    const { data: images, error: imgError } = await admin
      .from("product_images")
      .select("url, sort")
      .eq("product_id", id)
      .order("sort", { ascending: true });

    if (imgError) {
      console.error("Error fetching product images:", imgError);
    }

    // 獲取變體
    const { data: variants, error: vError } = await admin
      .from("product_variants")
      .select("id, name, options, price, stock, sku")
      .eq("product_id", id);

    // 將圖片 URL 數組添加到商品資料中
    const productWithImages = {
      id: product.id,
      sku: product.sku,
      title_zh: product.title_zh,
      title_original: product.title_original,
      desc_zh: product.desc_zh,
      desc_original: product.desc_original,
      retail_price_twd: product.retail_price_twd,
      wholesale_price_twd: isWholesaleTier ? product.wholesale_price_twd : null,
      status: product.status,
      created_at: product.created_at,
      updated_at: product.updated_at,
      images: (images || []).map((img) => img.url),
      specs: product.specs,
      variants: variants || [],
    };

    return NextResponse.json(productWithImages);
  } catch (err) {
    console.error("GET /api/products/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = supabaseAdmin();
    const { id } = await params;
    const body = await request.json();

    // Extract images if present
    const { images, ...productData } = body;

    const { data, error } = await admin
      .from("products")
      .update(productData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Handle images update if provided
    if (images && Array.isArray(images)) {
      // 1. Delete existing images
      const { error: delError } = await admin
        .from("product_images")
        .delete()
        .eq("product_id", id);
      
      if (delError) {
        console.error("Error deleting old images:", delError);
        // Continue to try inserting new ones? Might duplicate if delete failed but simpler to proceed.
      }

      // 2. Insert new images
      if (images.length > 0) {
        const imageInserts = images.map((img: any) => ({
          product_id: id,
          url: img.url,
          sort: img.sort || 0
        }));

        const { error: insError } = await admin
          .from("product_images")
          .insert(imageInserts);

        if (insError) {
          console.error("Error inserting new images:", insError);
        }
      }
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PUT /api/products/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = supabaseAdmin();
    const { id } = await params;

    const { error } = await admin
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/products/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
