import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { deleteSessionById, getSessionById } from "@/lib/doso/importSessionService";

export const runtime = "nodejs";

const toSessionId = (value: string) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    }

    const routeParams = await params;
    const sessionId = toSessionId(routeParams.sessionId);
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "sessionId 格式錯誤" }, { status: 400 });
    }

    const session = await getSessionById(sessionId, auth.userId);
    if (!session) {
      return NextResponse.json({ ok: false, error: "找不到導入 session 或無存取權限" }, { status: 404 });
    }

    await deleteSessionById(sessionId, auth.userId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "重置同步任務失敗，請稍後再試" }, { status: 500 });
  }
}
