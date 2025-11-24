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
    const { item_id, weight, shipping_method, box_fee, shipping_country } = body;

    if (!item_id) {
      return NextResponse.json({ error: "缺少必要參數 (item_id)" }, { status: 400 });
    }

    // 1. Fetch Settings
    const { data: settingsData, error: settingsError } = await admin.from("shipping_settings").select("*");
    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
      throw settingsError;
    }
    
    const settings: Record<string, number> = {};
    settingsData?.forEach((s: any) => {
      if (s.key && s.value !== undefined) {
        settings[s.key] = Number(s.value);
      }
    });

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
    const newWeight = weight !== undefined ? Number(weight) : (item.weight || 0);
    const newMethod = shipping_method !== undefined ? shipping_method : item.shipping_method;
    const newBoxFee = box_fee !== undefined ? Number(box_fee) : (item.box_fee || 0);
    const newCountry = shipping_country !== undefined ? shipping_country : item.shipping_country;

    let intlFee = item.shipping_fee_intl || 0;
    let domFee = item.shipping_fee_domestic || 0;

    // Calculate Intl Fee based on country and weight
    if (!isNaN(newWeight) && newWeight >= 0) {
      if (newCountry === 'KR' && settings.rate_intl_kr) {
        intlFee = Math.ceil(newWeight * settings.rate_intl_kr);
      } else if (newCountry === 'JP' && settings.rate_intl_jp) {
        intlFee = Math.ceil(newWeight * settings.rate_intl_jp);
      } else if (newCountry === 'TH' && settings.rate_intl_th) {
        intlFee = Math.ceil(newWeight * settings.rate_intl_th);
      } else if (settings.rate_intl_kg) {
        // Fallback to generic rate if country not specified or no country specific rate
        intlFee = Math.ceil(newWeight * settings.rate_intl_kg);
      } else {
        intlFee = 0; // Reset if no rate found
      }
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
        case "HSINCHU":
          domFee = settings.rate_dom_hsinchu || 0;
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
        shipping_country: newCountry,
        shipping_fee_intl: intlFee,
        shipping_fee_domestic: domFee,
        updated_at: new Date().toISOString()
      })
      .eq("id", item_id);

    if (updateError) {
      console.error("Update error details:", updateError);
      return NextResponse.json({ error: "更新運費失敗: " + updateError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: { 
        weight: newWeight, 
        shipping_method: newMethod, 
        box_fee: newBoxFee, 
        shipping_country: newCountry,
        shipping_fee_intl: intlFee, 
        shipping_fee_domestic: domFee 
      } 
    });

  } catch (err) {
    console.error("Update item shipping error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
