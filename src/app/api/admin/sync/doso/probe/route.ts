import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { runDosoProbe } from "@/lib/doso/probeService";
import { DEFAULT_DOSO_TARGETS } from "@/lib/doso/targets";
import { getSavedDosoCredentialsForLogin } from "@/lib/doso/credentialStore";
import type { DosoProbeRequestBody } from "@/lib/doso/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = (await request.json().catch(() => null)) as Partial<DosoProbeRequestBody> | null;
    const requestUsername = (body?.username || "").trim();
    const requestPassword = body?.password || "";

    if ((requestUsername && !requestPassword) || (!requestUsername && requestPassword)) {
      return NextResponse.json(
        { error: "請同時輸入帳號與密碼，或兩者皆留空使用已儲存帳密" },
        { status: 400 }
      );
    }

    const credentials = requestUsername && requestPassword
      ? { username: requestUsername, password: requestPassword }
      : await getSavedDosoCredentialsForLogin();

    if (!credentials?.username || !credentials?.password) {
      return NextResponse.json({ error: "缺少 DOSO 帳號或密碼，請先輸入或儲存帳密" }, { status: 400 });
    }

    const rawTargets = Array.isArray(body?.targets) ? body.targets : DEFAULT_DOSO_TARGETS;
    const targets = rawTargets
      .filter((x) => typeof x === "string")
      .map((x) => x.trim())
      .filter((x) => {
        try {
          const u = new URL(x);
          return u.protocol === "https:" && u.hostname === "www.doso.net";
        } catch {
          return false;
        }
      });

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
