import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { listRecentSessions } from "@/lib/doso/importSessionService";
import type { DosoImportSessionsListApiResponse } from "@/lib/doso/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error } satisfies DosoImportSessionsListApiResponse, {
        status: auth.status,
      });
    }

    const sessions = await listRecentSessions(auth.userId, 3);
    return NextResponse.json({ ok: true, sessions } satisfies DosoImportSessionsListApiResponse);
  } catch {
    return NextResponse.json(
      { ok: false, error: "讀取同步任務失敗，請稍後再試" } satisfies DosoImportSessionsListApiResponse,
      { status: 500 }
    );
  }
}
