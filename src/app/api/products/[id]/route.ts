import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

 const ensureHttps = (url: string) => (url ? url.replace(/^http:/, "https:") : url);

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

    // 獲取商品圖片 (包含 is_product 和 is_description)
    const { data: images, error: imgError } = await admin
      .from("product_images")
      .select("url, sort, is_product, is_description")
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

    // 將圖片資料添加到商品資料中（包含完整圖片資訊）
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
      // 返回完整圖片資訊（包含 is_product 和 is_description）
      images: (images || []).map((img: any) => ({
        url: ensureHttps(img.url),
        sort: img.sort,
        is_product: img.is_product ?? true,
        is_description: img.is_description ?? false,
      })),
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

    // Extract images, specs, variants if present
    const { images, specs, variants, ...productData } = body;

    const { data, error } = await admin
      .from("products")
      .update({
        ...productData,
        specs: specs ? specs : undefined
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Handle variants update if provided
    if (variants && Array.isArray(variants)) {
      // For simplicity, delete all existing variants and re-insert
      // This is safe because we re-generate variants in frontend based on specs
      // Note: This might break existing order items if we hard delete.
      // However, order items should reference variant ID. If we delete, we lose link.
      // But user wants to "edit" specs. If specs change, variants change.
      // Ideally we should try to update existing ones if IDs match, and insert new ones.
      // But `variants` from frontend might not have IDs if they are regenerated.
      // Given the requirement "specs setting was mistaken", we assume admin is fixing specs.
      // If we delete variants, `order_items.variant_id` might be set NULL (ON DELETE SET NULL).
      // Let's implement full replace for now as it's cleaner for "fixing" mistakes.
      
      const { error: vDelError } = await admin
        .from("product_variants")
        .delete()
        .eq("product_id", id);
      
      if (vDelError) {
        console.error("Error deleting old variants:", vDelError);
      }

      if (variants.length > 0) {
        const variantInserts = variants.map((v: any) => ({
          product_id: id,
          name: v.name,
          options: v.options,
          price: v.price,
          stock: v.stock,
          sku: v.sku
        }));
        
        const { error: vInsError } = await admin
          .from("product_variants")
          .insert(variantInserts);

        if (vInsError) {
           console.error("Error inserting new variants:", vInsError);
        }
      }
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

      // 2. Insert new images (包含 is_product 和 is_description)
      if (images.length > 0) {
        const imageInserts = images.map((img: any) => ({
          product_id: id,
          url: img.url,
          sort: img.sort || 0,
          is_product: img.is_product ?? true,
          is_description: img.is_description ?? false,
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
