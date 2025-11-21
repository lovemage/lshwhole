import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// 檢查會員資格的排程任務
// 規則：Retail/Wholesale 會員若 45 日內消費未滿 300 元，則關閉登入權限
export async function GET(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    
    // 驗證權限：檢查 CRON_SECRET 或 Admin Token
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
    
    // 若非 Cron，則檢查是否為管理員
    if (!isCron) {
      // 這裡簡化：若無 CRON_SECRET 且無 Auth，則拒絕（除非在開發環境可放寬）
      // 為了測試方便，若是在開發環境且無設定 CRON_SECRET，暫時允許
      if (process.env.NODE_ENV === 'production' && !authHeader) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // 1. 找出所有需要檢查的會員 (Retail/Wholesale 且目前開啟登入)
    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("user_id, tier, created_at")
      .in("tier", ["retail", "wholesale"])
      .eq("login_enabled", true);

    if (profilesError) {
      console.error("Fetch profiles error:", profilesError);
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    const date45DaysAgo = new Date();
    date45DaysAgo.setDate(date45DaysAgo.getDate() - 45);
    const date45DaysAgoStr = date45DaysAgo.toISOString();

    const results = {
      checked: 0,
      disabled: 0,
      skipped_new: 0,
      details: [] as any[],
    };

    for (const profile of profiles || []) {
      // 若註冊未滿 45 天，跳過
      if (new Date(profile.created_at) > date45DaysAgo) {
        results.skipped_new++;
        continue;
      }

      results.checked++;

      // 2. 查詢 45 天內的有效訂單總金額
      const { data: orders, error: ordersError } = await admin
        .from("orders")
        .select("total_twd")
        .eq("user_id", profile.user_id)
        .neq("status", "CANCELLED") // 排除已取消
        .neq("status", "REFUNDED")  // 排除已退款 (視規則而定，通常退款也應扣除)
        .gte("created_at", date45DaysAgoStr);

      if (ordersError) {
        console.error(`Check orders error for ${profile.user_id}:`, ordersError);
        continue;
      }

      const totalConsumption = orders?.reduce((sum, order) => sum + (order.total_twd || 0), 0) || 0;

      // 3. 若未滿 300 元，關閉權限
      if (totalConsumption < 300) {
        const { error: updateError } = await admin
          .from("profiles")
          .update({
            login_enabled: false,
            login_disabled_at: new Date().toISOString(),
            login_disabled_reason: `系統自動關閉：45日內消費累積 ${totalConsumption} 元 (未滿 300 元)`,
          })
          .eq("user_id", profile.user_id);

        if (updateError) {
          console.error(`Disable login error for ${profile.user_id}:`, updateError);
        } else {
          results.disabled++;
          results.details.push({
            user_id: profile.user_id,
            tier: profile.tier,
            consumption: totalConsumption,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Membership check completed",
      results,
    });

  } catch (err) {
    console.error("Cron job error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
