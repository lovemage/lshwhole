import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import {
  getSessionById,
  markSessionStatus,
} from "@/lib/doso/importSessionService";
import type { DosoImportPauseApiResponse } from "@/lib/doso/types";

export const runtime = "nodejs";

const toSessionId = (value: string) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error } satisfies DosoImportPauseApiResponse, {
        status: auth.status,
      });
    }

    const routeParams = await params;
    const sessionId = toSessionId(routeParams.sessionId);
    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: "sessionId 格式錯誤" } satisfies DosoImportPauseApiResponse,
        { status: 400 }
      );
    }

    const session = await getSessionById(sessionId, auth.userId);
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "找不到導入 session 或無存取權限" } satisfies DosoImportPauseApiResponse,
        { status: 404 }
      );
    }

    if (session.status === "completed" || session.status === "failed") {
      return NextResponse.json({ ok: true, session } satisfies DosoImportPauseApiResponse);
    }

    const paused = await markSessionStatus({
      sessionId,
      status: "paused",
      errorMessage: null,
    });

    return NextResponse.json({ ok: true, session: paused } satisfies DosoImportPauseApiResponse);
  } catch {
    return NextResponse.json(
      { ok: false, error: "暫停導入失敗，請稍後再試" } satisfies DosoImportPauseApiResponse,
      { status: 500 }
    );
  }
}
