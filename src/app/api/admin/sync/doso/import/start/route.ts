import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { runDosoImportPreview } from "@/lib/doso/probeService";
import {
  bulkInsertImportItems,
  createImportSession,
  markSessionStatus,
  updateSessionCounters,
} from "@/lib/doso/importSessionService";
import { getSavedDosoCredentialsForLogin } from "@/lib/doso/credentialStore";
import type {
  DosoImportStartApiResponse,
  DosoImportStartRequest,
} from "@/lib/doso/types";

export const runtime = "nodejs";

const parseSingleDosoTarget = (input: unknown) => {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length !== 1) return null;

  try {
    const url = new URL(tokens[0]);
    if (url.protocol !== "https:" || url.hostname !== "www.doso.net") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
};

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error } satisfies DosoImportStartApiResponse, {
        status: auth.status,
      });
    }

    let body: Partial<DosoImportStartRequest>;
    try {
      body = (await request.json()) as Partial<DosoImportStartRequest>;
    } catch {
      return NextResponse.json(
        { ok: false, error: "JSON 格式錯誤" } satisfies DosoImportStartApiResponse,
        { status: 400 }
      );
    }

    const requestUsername = typeof body?.username === "string" ? body.username.trim() : "";
    const requestPassword = typeof body?.password === "string" ? body.password : "";
    const parsedTargetFromSnake = parseSingleDosoTarget(body?.target_url);
    const parsedTargetFromCamel = parseSingleDosoTarget(body?.targetUrl);
    const targetUrl = parsedTargetFromSnake || parsedTargetFromCamel;

    if ((requestUsername && !requestPassword) || (!requestUsername && requestPassword)) {
      return NextResponse.json(
        {
          ok: false,
          error: "請同時輸入帳號與密碼，或兩者皆留空使用已儲存帳密",
        } satisfies DosoImportStartApiResponse,
        { status: 400 }
      );
    }

    const credentials = requestUsername && requestPassword
      ? { username: requestUsername, password: requestPassword }
      : await getSavedDosoCredentialsForLogin();

    if (!credentials?.username || !credentials?.password) {
      return NextResponse.json(
        { ok: false, error: "缺少 DOSO 帳號或密碼，請先輸入或儲存帳密" } satisfies DosoImportStartApiResponse,
        { status: 400 }
      );
    }

    if (!targetUrl) {
      return NextResponse.json(
        { ok: false, error: "目錄 URL 格式錯誤，請輸入單一 DOSO 網址" } satisfies DosoImportStartApiResponse,
        { status: 400 }
      );
    }

    const preview = await runDosoImportPreview({
      username: credentials.username,
      password: credentials.password,
      targets: [targetUrl],
    });

    if (!preview.login_ok) {
      return NextResponse.json(
        {
          ok: false,
          error: preview.error || "登入失敗",
          login_ok: false,
        } satisfies DosoImportStartApiResponse,
        { status: 401 }
      );
    }

    const firstTarget = preview.targets[0];
    if (firstTarget?.error) {
      return NextResponse.json(
        {
          ok: false,
          error: firstTarget.error,
          login_ok: true,
        } satisfies DosoImportStartApiResponse,
        { status: 400 }
      );
    }

    const session = await createImportSession({
      adminUserId: auth.userId,
      targetUrl,
      totalCount: preview.products.length,
      status: "pending",
    });

    let refreshed = session;
    try {
      await bulkInsertImportItems(session.session_id, preview.products);
      refreshed = await updateSessionCounters(session.session_id);
    } catch (insertErr) {
      try {
        await markSessionStatus({
          sessionId: session.session_id,
          status: "failed",
          errorMessage: insertErr instanceof Error ? insertErr.message : "session initialization failed",
        });
      } catch {
        // noop
      }
      throw insertErr;
    }

    return NextResponse.json({
      ok: true,
      login_ok: true,
      session: refreshed,
    } satisfies DosoImportStartApiResponse);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "啟動導入失敗，請稍後再試",
      } satisfies DosoImportStartApiResponse,
      { status: 500 }
    );
  }
}
