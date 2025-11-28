import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";

// 管理端：批准或拒絕會員的批發升級申請
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = supabaseAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => ({} as any));
    const action = body?.action as string;

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "action 必須為 approve 或 reject" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const patch: any =
      action === "approve"
        ? {
            tier: "wholesale",
            wholesale_upgrade_status: "APPROVED",
            wholesale_upgrade_reviewed_at: now,
            updated_at: now,
          }
        : {
            wholesale_upgrade_status: "REJECTED",
            wholesale_upgrade_reviewed_at: now,
            updated_at: now,
          };

    const { data, error } = await admin
      .from("profiles")
      .update(patch)
      .eq("user_id", id)
      .select("user_id, email, display_name, tier, wholesale_upgrade_status, wholesale_upgrade_requested_at, wholesale_upgrade_reviewed_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Send email notification
    if (data.email) {
      const template = action === "approve" ? "upgrade_success" : "upgrade_failed";
      await sendEmail(data.email, template, {
        name: data.display_name || "會員",
        level: action === "approve" ? "批發會員" : "一般會員",
      });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("POST /api/admin/members/[id]/upgrade error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
