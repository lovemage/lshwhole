import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

// 會員端：查詢訂單列表
export async function GET(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const authHeader = request.headers.get("Authorization");
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

    // 查詢該會員的訂單
    const { data: orders, error } = await admin
      .from("orders")
      .select(`
        *,
        order_items (
          *,
          product:products (
            title_zh,
            title_original,
            sku,
            status
          )
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "查詢訂單失敗" }, { status: 500 });
    }

    // Fetch product images for items
    const list = orders || [];
    const productIds = list.flatMap((o: any) => o.order_items?.map((item: any) => item.product_id) || []).filter(Boolean);
    let imageMap = new Map<number, string[]>();

    if (productIds.length > 0) {
      const { data: imgs } = await admin
        .from("product_images")
        .select("product_id, url, sort")
        .in("product_id", productIds)
        .order("sort", { ascending: true });

      if (imgs) {
        const byProduct = new Map<number, { url: string; sort: number }[]>();
        imgs.forEach((img: any) => {
          if (!byProduct.has(img.product_id)) byProduct.set(img.product_id, []);
          byProduct.get(img.product_id)!.push(img);
        });
        byProduct.forEach((images, pid) => {
          imageMap.set(pid, images.sort((a, b) => a.sort - b.sort).map(i => i.url));
        });
      }
    }

    const result = list.map((o: any) => ({
      ...o,
      order_items: o.order_items?.map((item: any) => ({
        ...item,
        product: {
          ...item.product,
          images: imageMap.get(item.product_id) || []
        }
      }))
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/orders error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// 會員端：創建訂單（從錢包扣款）
export async function POST(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const authHeader =
      request.headers.get("Authorization") || request.headers.get("authorization");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!authHeader?.startsWith("Bearer ") || !supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "未登入或憑證無效" }, { status: 401 });
    }

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const body = await request.json();
    const { items, shipping_address, phone, note, recipient_name } = body;

    // items: [{ product_id: number, qty: number }]
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "訂單項目不能為空" }, { status: 400 });
    }

    // 驗證收件資訊
    if (!recipient_name || !phone || !shipping_address) {
      return NextResponse.json({ error: "請填寫完整的收件資訊" }, { status: 400 });
    }

    // 1. 驗證商品並計算總金額
    let totalAmount = 0;
    const orderItems: Array<{ product_id: number; qty: number; unit_price: number }> = [];

    for (const item of items) {
      const { product_id, qty } = item;
      if (!product_id || !qty || qty <= 0) {
        return NextResponse.json({ error: "商品數量必須大於 0" }, { status: 400 });
      }

      // 查詢商品資訊
      const { data: product, error: productError } = await admin
        .from("products")
        .select("id, wholesale_price_twd, retail_price_twd, moq, status")
        .eq("id", product_id)
        .single();

      if (productError || !product) {
        return NextResponse.json(
          { error: `商品 ${product_id} 不存在` },
          { status: 400 }
        );
      }

      if (product.status !== "published") {
        return NextResponse.json(
          { error: `商品 ${product_id} 未上架` },
          { status: 400 }
        );
      }

      // 檢查 MOQ
      if (product.moq && qty < product.moq) {
        return NextResponse.json(
          { error: `商品 ${product_id} 最小訂購量為 ${product.moq}` },
          { status: 400 }
        );
      }

      // 使用批發價或零售價
      const unitPrice = product.wholesale_price_twd || product.retail_price_twd || 0;
      if (unitPrice <= 0) {
        return NextResponse.json(
          { error: `商品 ${product_id} 價格無效` },
          { status: 400 }
        );
      }

      const itemTotal = Math.floor(unitPrice * qty);
      totalAmount += itemTotal;

      orderItems.push({
        product_id,
        qty,
        unit_price: Math.floor(unitPrice),
      });
    }

    if (totalAmount <= 0) {
      return NextResponse.json({ error: "訂單金額必須大於 0" }, { status: 400 });
    }

    // 2. 使用交易鎖讀取錢包並扣款
    const externalRef = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 開始交易：鎖定錢包
    const { data: wallet, error: walletError } = await admin
      .from("wallets")
      .select("balance_twd")
      .eq("user_id", user.id)
      .single();

    if (walletError || !wallet) {
      return NextResponse.json(
        { error: "錢包不存在，請先儲值" },
        { status: 400 }
      );
    }

    if (wallet.balance_twd < totalAmount) {
      return NextResponse.json(
        { error: `餘額不足，需要 NT$${totalAmount}，目前餘額 NT$${wallet.balance_twd}` },
        { status: 400 }
      );
    }

    // 3. 創建 wallet_hold
    const { data: hold, error: holdError } = await admin
      .from("wallet_holds")
      .insert({
        user_id: user.id,
        state: "FROZEN",
        amount_total_twd: totalAmount,
        amount_converted_twd: 0,
        amount_released_twd: 0,
      })
      .select("id")
      .single();

    if (holdError || !hold) {
      return NextResponse.json(
        { error: "創建凍結記錄失敗" },
        { status: 500 }
      );
    }

    // 4. 寫入 wallet_ledger (HOLD)
    const { error: ledgerError } = await admin
      .from("wallet_ledger")
      .insert({
        user_id: user.id,
        type: "HOLD",
        amount_twd: totalAmount,
        charge_type: "PRODUCT",
        external_ref: externalRef,
      });

    if (ledgerError) {
      return NextResponse.json(
        { error: "創建錢包記錄失敗" },
        { status: 500 }
      );
    }

    // 5. 更新錢包餘額（扣除凍結金額）
    const newBalance = wallet.balance_twd - totalAmount;
    const { error: updateWalletError } = await admin
      .from("wallets")
      .update({
        balance_twd: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateWalletError) {
      return NextResponse.json(
        { error: "更新錢包餘額失敗" },
        { status: 500 }
      );
    }

    // 6. 創建訂單（包含收件資訊）
    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        user_id: user.id,
        status: "PENDING",
        total_twd: totalAmount,
        hold_id: hold.id,
        tracking_summary: note || null,
        recipient_name: recipient_name,
        recipient_phone: phone,
        shipping_address: shipping_address,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("創建訂單失敗:", orderError);
      return NextResponse.json(
        { error: "創建訂單失敗", details: orderError },
        { status: 500 }
      );
    }

    // 7. 更新 wallet_hold 的 order_id
    await admin
      .from("wallet_holds")
      .update({ order_id: order.id })
      .eq("id", hold.id);

    // 8. 創建訂單項目
    const orderItemsInsert = orderItems.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      qty: item.qty,
      unit_price_twd: item.unit_price,
    }));

    const { error: itemsError } = await admin
      .from("order_items")
      .insert(orderItemsInsert);

    if (itemsError) {
      console.error("創建訂單項目失敗:", itemsError);
      // 刪除已創建的訂單和相關記錄
      await admin.from("orders").delete().eq("id", order.id);
      await admin.from("wallet_holds").delete().eq("order_id", order.id);
      await admin.from("wallet_ledger").delete().eq("external_ref", externalRef);
      return NextResponse.json(
        { error: "創建訂單項目失敗，請聯繫管理員" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      order_id: order.id,
      total_amount: totalAmount,
      new_balance: newBalance,
    });
  } catch (err) {
    console.error("POST /api/orders error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
