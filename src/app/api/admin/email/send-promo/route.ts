import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const body = await request.json();
    const { templateKey, productIds } = body; // productIds: number[] | undefined

    if (templateKey !== "new_product_promo") {
      return NextResponse.json({ error: "Invalid template key" }, { status: 400 });
    }

    // 1. Fetch Users
    // Only fetch users who have an email
    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("email, display_name")
      .not("email", "is", null);

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ error: "No users found" }, { status: 400 });
    }

    // 2. Fetch Products to populate {product_list}
    let query = admin
      .from("products")
      .select("id, title_zh, title_original, retail_price_twd, images")
      .eq("status", "published");

    if (productIds && Array.isArray(productIds) && productIds.length > 0) {
      query = query.in("id", productIds);
    } else {
      // Default: 5 latest
      query = query.order("created_at", { ascending: false }).limit(5);
    }

    const { data: products } = await query;

    let productListHtml = "";
    if (products && products.length > 0) {
      productListHtml = `<div style="max-width: 100%;">`;
      products.forEach(p => {
        const title = p.title_zh || p.title_original;
        const image = (p.images && p.images.length > 0) ? p.images[0] : null;
        
        productListHtml += `
          <div style="border: 1px solid #eee; border-radius: 8px; overflow: hidden; margin-bottom: 15px; background-color: #fff;">
            ${image ? `<div style="width: 100%; height: 200px; background-image: url('${image}'); background-size: cover; background-position: center;"></div>` : ''}
            <div style="padding: 15px;">
              <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #333;">${title}</h3>
              <p style="margin: 0; font-weight: bold; color: #d32f2f;">NT$ ${p.retail_price_twd}</p>
              <div style="margin-top: 10px;">
                <a href="https://lshwholesale.com/products/${p.id}" style="display: inline-block; font-size: 14px; text-decoration: none; color: #000; font-weight: bold;">查看商品 &rarr;</a>
              </div>
            </div>
          </div>`;
      });
      productListHtml += `</div>`;
    } else {
      productListHtml = "<p>前往網站查看最新商品！</p>";
    }

    // 3. Send Emails
    let successCount = 0;
    let failCount = 0;

    // Use Promise.all to send in parallel (Resend can handle it, but maybe limit concurrency if list is huge)
    // For now, simple loop or Promise.all is fine for small/medium lists.
    // Given Resend free tier is 3000/mo, list likely isn't massive yet.
    
    const sendPromises = profiles.map(async (profile) => {
        if (!profile.email) return;
        
        // Basic rate limiting or delay could be added here if needed
        const result = await sendEmail(profile.email, templateKey, {
            name: profile.display_name || '會員',
            product_list: productListHtml
        });

        if (result.success) successCount++;
        else failCount++;
    });

    await Promise.all(sendPromises);

    return NextResponse.json({ success: true, successCount, failCount });

  } catch (err) {
    console.error("Send promo email error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
