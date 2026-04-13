import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getSavedCredentialsForLogin } from "@/lib/doso/credentialStore";
import { runDosoSourceCategoryRefresh } from "@/lib/doso/probeService";
import { DOSO_TARGET_OPTIONS } from "@/lib/doso/targets";
import { saveDosoSourceCategoryCache } from "@/lib/doso/sourceCategoryStore";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    }

    const body = (await request.json().catch(() => null)) as
      | { username?: string; password?: string; source?: "doso" | "toybox" }
      | null;

    const source = body?.source === "toybox" ? "toybox" : "doso";
    const requestUsername = typeof body?.username === "string" ? body.username.trim() : "";
    const requestPassword = typeof body?.password === "string" ? body.password : "";

    if (!requestUsername && requestPassword) {
      return NextResponse.json(
        { ok: false, error: "僅輸入密碼時需同時輸入帳號" },
        { status: 400 }
      );
    }

    const savedCredentials = await getSavedCredentialsForLogin(source);
    const credentials = requestUsername && requestPassword
      ? { username: requestUsername, password: requestPassword }
      : requestUsername && !requestPassword
        ? savedCredentials?.username === requestUsername
          ? savedCredentials
          : null
        : savedCredentials;

    if (!credentials?.username || !credentials?.password) {
      return NextResponse.json(
        { ok: false, error: "缺少 DOSO 帳號或密碼，請先輸入或儲存帳密" },
        { status: 400 }
      );
    }

    const refresh = await runDosoSourceCategoryRefresh({
      username: credentials.username,
      password: credentials.password,
      targets: DOSO_TARGET_OPTIONS.map((x) => x.url),
    });

    if (!refresh.login_ok) {
      return NextResponse.json(
        { ok: false, error: refresh.error || "來源分類同步失敗" },
        { status: 400 }
      );
    }

    const cache = await saveDosoSourceCategoryCache(refresh.directories);
    return NextResponse.json({ ok: true, categories: cache });
  } catch {
    return NextResponse.json(
      { ok: false, error: "refresh_source_categories_failed" },
      { status: 500 }
    );
  }
}
