import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { runDosoImportPreview } from "@/lib/doso/probeService";
import { DEFAULT_DOSO_TARGETS, DOSO_TARGET_OPTIONS } from "@/lib/doso/targets";
import type { DosoProbeRequestBody } from "@/lib/doso/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = (await request.json()) as DosoProbeRequestBody;
    const username = (body?.username || "").trim();
    const password = body?.password || "";

    if (!username || !password) {
      return NextResponse.json({ error: "缺少 DOSO 帳號或密碼" }, { status: 400 });
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

    const result = await runDosoImportPreview({ username, password, targets });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "import API failed" },
      { status: 500 }
    );
  }
}
