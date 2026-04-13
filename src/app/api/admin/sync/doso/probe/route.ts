import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { runDosoProbe } from "@/lib/doso/probeService";
import { DEFAULT_DOSO_TARGETS, DOSO_TARGET_OPTIONS } from "@/lib/doso/targets";
import { getSavedCredentialsForLogin } from "@/lib/doso/credentialStore";
import type { DosoProbeRequestBody } from "@/lib/doso/types";

export const runtime = "nodejs";

const isToyboxUrl = (value: string) => {
  try {
    const u = new URL(value);
    return u.hostname === "www.toybox.kr" || u.hostname === "toybox.kr";
  } catch {
    return false;
  }
};

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = (await request.json().catch(() => null)) as Partial<DosoProbeRequestBody> | null;
    const requestUsername = (body?.username || "").trim();
    const requestPassword = body?.password || "";

    if (!requestUsername && requestPassword) {
      return NextResponse.json({ error: "僅輸入密碼時需同時輸入帳號" }, { status: 400 });
    }

    const rawTargets = Array.isArray(body?.targets) ? body.targets : DEFAULT_DOSO_TARGETS;
    const targets = rawTargets
      .filter((x) => typeof x === "string")
      .map((x) => x.trim())
      .filter((x) => {
        try {
          const inputUrl = new URL(x);
          if (inputUrl.protocol !== "https:" && inputUrl.protocol !== "http:") return false;
          return DOSO_TARGET_OPTIONS.some((option) => {
            try {
              const allowed = new URL(option.url);
              const allowedPath = allowed.pathname.replace(/\/$/, "");
              const inputPath = inputUrl.pathname.replace(/\/$/, "");
              if (inputUrl.hostname !== allowed.hostname) return false;
              if (!allowedPath) return true;
              return inputPath.startsWith(allowedPath);
            } catch {
              return false;
            }
          });
        } catch {
          return false;
        }
      });

    const source = targets.length > 0 && targets.every((x) => isToyboxUrl(x)) ? "toybox" : "doso";
    const savedCredentials = await getSavedCredentialsForLogin(source);
    const credentials = requestUsername && requestPassword
      ? { username: requestUsername, password: requestPassword }
      : requestUsername && !requestPassword
        ? savedCredentials?.username === requestUsername
          ? savedCredentials
          : null
        : savedCredentials;

    if (!credentials?.username || !credentials?.password) {
      return NextResponse.json({ error: "缺少 DOSO 帳號或密碼，請先輸入或儲存帳密" }, { status: 400 });
    }

    const result = await runDosoProbe({
      username: credentials.username,
      password: credentials.password,
      targets,
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "probe_api_failed" },
      { status: 500 }
    );
  }
}
