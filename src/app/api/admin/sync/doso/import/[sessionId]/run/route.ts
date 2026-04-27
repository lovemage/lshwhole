import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import {
  getSessionById,
  listPendingItems,
  markItemFailed,
  markItemImported,
  markItemSkipped,
  markSessionStatus,
  updateSessionCounters,
} from "@/lib/doso/importSessionService";
import type {
  DosoImportRunApiResponse,
  DosoImportRunRequest,
  DosoImportProduct,
} from "@/lib/doso/types";

export const runtime = "nodejs";

const toSessionId = (value: string) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const toBatchSize = (value: unknown) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 20;
  return Math.min(100, Math.max(1, Math.floor(n)));
};

const hasUsableImage = (images: unknown) => {
  if (!Array.isArray(images)) return false;
  return images.some((raw) => {
    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value) return false;
    return !/\/shop\/img\/no_image\.gif$/i.test(value);
  });
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  let currentSessionId: number | null = null;
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error } satisfies DosoImportRunApiResponse, {
        status: auth.status,
      });
    }

    const routeParams = await params;
    const sessionId = toSessionId(routeParams.sessionId);
    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: "sessionId 格式錯誤" } satisfies DosoImportRunApiResponse,
        { status: 400 }
      );
    }
    currentSessionId = sessionId;

    const session = await getSessionById(sessionId, auth.userId);
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "找不到導入 session 或無存取權限" } satisfies DosoImportRunApiResponse,
        { status: 404 }
      );
    }

    if (session.status === "completed") {
      return NextResponse.json({
        ok: true,
        session,
        products: [],
        processed_in_batch: 0,
        imported_in_batch: 0,
        skipped_in_batch: 0,
        failed_in_batch: 0,
      } satisfies DosoImportRunApiResponse);
    }

    if (session.status === "failed") {
      return NextResponse.json(
        { ok: false, error: "此導入 session 已失敗，請重新建立新 session" } satisfies DosoImportRunApiResponse,
        { status: 409 }
      );
    }

    let body: Partial<DosoImportRunRequest> = {};
    try {
      body = (await request.json()) as Partial<DosoImportRunRequest>;
    } catch {
      // allow empty body
    }

    const batchSize = toBatchSize(body.batch_size || body.batchSize);
    await markSessionStatus({ sessionId, status: "running", errorMessage: null });

    const pendingItems = await listPendingItems(sessionId, batchSize);
    if (pendingItems.length === 0) {
      const refreshed = await updateSessionCounters(sessionId);
      const finalSession =
        refreshed.processed_count >= refreshed.total_count
          ? await markSessionStatus({ sessionId, status: "completed", errorMessage: null })
          : refreshed;

      return NextResponse.json({
        ok: true,
        session: finalSession,
        products: [],
        processed_in_batch: 0,
        imported_in_batch: 0,
        skipped_in_batch: 0,
        failed_in_batch: 0,
      } satisfies DosoImportRunApiResponse);
    }

    const admin = supabaseAdmin();
    const codes = Array.from(new Set(pendingItems.map((item) => item.product_code).filter(Boolean)));
    const { data: existingRows, error: existingError } =
      codes.length > 0
        ? await admin
            .from("products")
            .select("sku")
            .in("sku", codes)
            .returns<Array<{ sku: string }>>()
        : { data: [], error: null };

    if (existingError) {
      await markSessionStatus({
        sessionId,
        status: "failed",
        errorMessage: existingError.message,
      });
      return NextResponse.json(
        { ok: false, error: "查詢既有商品失敗" } satisfies DosoImportRunApiResponse,
        { status: 500 }
      );
    }

    const existingSkuSet = new Set((existingRows || []).map((r) => r.sku));
    const importedProducts: DosoImportProduct[] = [];
    let importedInBatch = 0;
    let skippedInBatch = 0;
    let failedInBatch = 0;

    for (const item of pendingItems) {
      try {
        if (!item.product_code) {
          await markItemFailed({ itemId: item.id, reason: "missing_product_code" });
          failedInBatch += 1;
          continue;
        }

        if (existingSkuSet.has(item.product_code)) {
          await markItemSkipped({ itemId: item.id, reason: "existing_sku" });
          skippedInBatch += 1;
          continue;
        }

        if (!item.payload || !item.payload.productCode) {
          await markItemFailed({ itemId: item.id, reason: "invalid_payload" });
          failedInBatch += 1;
          continue;
        }

        if (!hasUsableImage(item.payload.images)) {
          await markItemSkipped({ itemId: item.id, reason: "missing_image" });
          skippedInBatch += 1;
          continue;
        }

        await markItemImported({ itemId: item.id });
        importedProducts.push(item.payload);
        importedInBatch += 1;
      } catch (err) {
        await markItemFailed({
          itemId: item.id,
          reason: err instanceof Error ? err.message : "item_process_failed",
        });
        failedInBatch += 1;
      }
    }

    const refreshed = await updateSessionCounters(sessionId);
    const finalSession =
      refreshed.processed_count >= refreshed.total_count
        ? await markSessionStatus({ sessionId, status: "completed", errorMessage: null })
        : refreshed;

    return NextResponse.json({
      ok: true,
      session: finalSession,
      products: importedProducts,
      processed_in_batch: importedInBatch + skippedInBatch + failedInBatch,
      imported_in_batch: importedInBatch,
      skipped_in_batch: skippedInBatch,
      failed_in_batch: failedInBatch,
    } satisfies DosoImportRunApiResponse);
  } catch {
    if (currentSessionId) {
      try {
        await markSessionStatus({
          sessionId: currentSessionId,
          status: "failed",
          errorMessage: "run_failed_unexpected",
        });
      } catch {
        // noop
      }
    }
    return NextResponse.json(
      { ok: false, error: "執行導入失敗，請稍後再試" } satisfies DosoImportRunApiResponse,
      { status: 500 }
    );
  }
}
