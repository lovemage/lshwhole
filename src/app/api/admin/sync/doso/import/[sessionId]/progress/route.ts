import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import {
  getSessionById,
  updateSessionCounters,
} from "@/lib/doso/importSessionService";
import type { DosoImportProgressApiResponse } from "@/lib/doso/types";

export const runtime = "nodejs";

const toSessionId = (value: string) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
      return NextResponse.json(
        { ok: false, error: auth.error } satisfies DosoImportProgressApiResponse,
        { status: auth.status }
      );
    }

    const routeParams = await params;
    const sessionId = toSessionId(routeParams.sessionId);
    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: "sessionId 格式錯誤" } satisfies DosoImportProgressApiResponse,
        { status: 400 }
      );
    }

    const session = await getSessionById(sessionId, auth.userId);
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "找不到導入 session 或無存取權限" } satisfies DosoImportProgressApiResponse,
        { status: 404 }
      );
    }

    const refreshed = await updateSessionCounters(sessionId);
    return NextResponse.json({
      ok: true,
      session: refreshed,
    } satisfies DosoImportProgressApiResponse);
  } catch {
    return NextResponse.json(
      { ok: false, error: "查詢進度失敗，請稍後再試" } satisfies DosoImportProgressApiResponse,
      { status: 500 }
    );
  }
}
