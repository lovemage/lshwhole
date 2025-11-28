import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const admin = supabaseAdmin();

    // 1. Pending Upgrade Requests
    const { count: pendingUpgrades, error: upgradeError } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("wholesale_upgrade_status", "PENDING");

    if (upgradeError) console.error("Error fetching pending upgrades:", upgradeError);

    // 2. Pending Top-up Requests
    const { count: pendingTopups, error: topupError } = await admin
      .from("wallet_topup_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "PENDING");

    if (topupError) console.error("Error fetching pending topups:", topupError);

    // 3. Pending Orders
    const { count: pendingOrders, error: orderError } = await admin
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "PENDING");

    if (orderError) console.error("Error fetching pending orders:", orderError);

    return NextResponse.json({
      members: (pendingUpgrades || 0) + (pendingTopups || 0),
      orders: pendingOrders || 0,
    });
  } catch (err) {
    console.error("Notifications API Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
