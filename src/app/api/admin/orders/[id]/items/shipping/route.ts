import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // order_id
    const admin = supabaseAdmin();
    const body = await request.json();
    const { item_id, weight, shipping_method, box_fee } = body;

    if (!item_id) {
      return NextResponse.json({ error: "缺少必要參數 (item_id)" }, { status: 400 });
    }

    // 1. Fetch Settings
    const { data: settingsData, error: settingsError } = await admin.from("shipping_settings").select("*");
    if (settingsError) throw settingsError;
    
    const settings: Record<string, number> = {};
    settingsData?.forEach((s: any) => settings[s.key] = Number(s.value));

    // 2. Fetch Item
    const { data: item, error: itemError } = await admin
      .from("order_items")
      .select("*")
      .eq("id", item_id)
      .eq("order_id", id)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: "訂單項目不存在" }, { status: 404 });
    }

    // 3. Calculate Fees
    const newWeight = weight !== undefined ? Number(weight) : item.weight;
    const newMethod = shipping_method !== undefined ? shipping_method : item.shipping_method;
    const newBoxFee = box_fee !== undefined ? Number(box_fee) : item.box_fee;

    let intlFee = item.shipping_fee_intl;
    let domFee = item.shipping_fee_domestic;

    // Calculate Intl Fee if weight is present
    if (newWeight >= 0 && settings.rate_intl_kg) {
      intlFee = Math.ceil(newWeight * settings.rate_intl_kg);
    }

    // Calculate Domestic Fee if method is present
    if (newMethod) {
      switch (newMethod) {
        case "POST":
          domFee = settings.rate_dom_post || 0;
          break;
        case "BLACK_CAT":
          domFee = settings.rate_dom_blackcat || 0;
          break;
        case "CVS":
          domFee = settings.rate_dom_cvs || 0;
          break;
        case "WHOLESALE_STORE":
          domFee = 0; // Assumed 0 as member handles it
          break;
        default:
          domFee = 0;
      }
    }

    // 4. Update
    const { error: updateError } = await admin
      .from("order_items")
      .update({
        weight: newWeight,
        shipping_method: newMethod,
        box_fee: newBoxFee,
        shipping_fee_intl: intlFee,
        shipping_fee_domestic: domFee,
        updated_at: new Date().toISOString()
      })
      .eq("id", item_id);

    if (updateError) {
      return NextResponse.json({ error: "更新運費失敗" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: { 
        weight: newWeight, 
        shipping_method: newMethod, 
        box_fee: newBoxFee, 
        shipping_fee_intl: intlFee, 
        shipping_fee_domestic: domFee 
      } 
    });

  } catch (err) {
    console.error("Update item shipping error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
