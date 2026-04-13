import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import {
  getSavedCredentialStatus,
  saveCredentials,
  type CredentialSource,
} from "@/lib/doso/credentialStore";
import type { DosoCredentialsApiResponse } from "@/lib/doso/types";

export const runtime = "nodejs";

const parseCredentialSource = (request: NextRequest, bodySource?: unknown): CredentialSource => {
  const sourceFromQuery = request.nextUrl.searchParams.get("source");
  const raw = (typeof bodySource === "string" ? bodySource : sourceFromQuery || "doso").toLowerCase();
  return raw === "toybox" ? "toybox" : "doso";
};

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error } satisfies DosoCredentialsApiResponse, {
        status: auth.status,
      });
    }

    const source = parseCredentialSource(request);
    const status = await getSavedCredentialStatus(source);
    return NextResponse.json({ ok: true, ...status } satisfies DosoCredentialsApiResponse);
  } catch {
    return NextResponse.json(
      { ok: false, error: "credential_read_failed" } satisfies DosoCredentialsApiResponse,
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error } satisfies DosoCredentialsApiResponse, {
        status: auth.status,
      });
    }

    const body = (await request.json().catch(() => null)) as
      | { username?: unknown; password?: unknown; source?: unknown }
      | null;

    const source = parseCredentialSource(request, body?.source);

    const username = typeof body?.username === "string" ? body.username : "";
    const password = typeof body?.password === "string" ? body.password : undefined;

    if (!username.trim()) {
      return NextResponse.json(
        { ok: false, error: `缺少 ${source === "toybox" ? "Toybox" : "DOSO"} 帳號` } satisfies DosoCredentialsApiResponse,
        { status: 400 }
      );
    }

    const saved = await saveCredentials(source, { username, password });
    return NextResponse.json({ ok: true, ...saved } satisfies DosoCredentialsApiResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "儲存帳密失敗";
    const status = message === "missing_encryption_key" || message === "invalid_encryption_key" ? 500 : 400;
    const errorCode =
      message === "missing_encryption_key" || message === "invalid_encryption_key"
        ? message
        : "credential_save_failed";
    return NextResponse.json(
      { ok: false, error: errorCode } satisfies DosoCredentialsApiResponse,
      { status }
    );
  }
}
