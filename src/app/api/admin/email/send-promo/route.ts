import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const body = await request.json();
    const { templateKey } = body;

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

    // 2. Fetch "New Products" to populate {product_list}
    // Get 5 latest published products
    const { data: newProducts } = await admin
      .from("products")
      .select("id, title_zh, title_original, retail_price_twd")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(5);

    let productListHtml = "";
    if (newProducts && newProducts.length > 0) {
      productListHtml = `<ul style="list-style: none; padding: 0;">`;
      newProducts.forEach(p => {
        const title = p.title_zh || p.title_original;
        productListHtml += `
          <li style="margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
            <strong>${title}</strong><br/>
            售價: NT$ ${p.retail_price_twd}
          </li>`;
      });
      productListHtml += `</ul>`;
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
