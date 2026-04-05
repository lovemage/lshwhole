import { supabaseAdmin } from "@/lib/supabase";
import type {
  DosoImportProduct,
  DosoImportSessionProgress,
  DosoImportSessionStatus,
} from "@/lib/doso/types";

interface SessionRow {
  id: number;
  status: DosoImportSessionStatus;
  total_count: number;
  processed_count: number;
  imported_count: number;
  skipped_count: number;
  failed_count: number;
  last_checkpoint_product_code: string | null;
  error_message: string | null;
}

export interface ImportItemRow {
  id: number;
  session_id: number;
  product_code: string;
  status: "pending" | "running" | "imported" | "skipped_existing" | "failed";
  reason: string | null;
  payload: DosoImportProduct | null;
}

const SESSION_SELECT =
  "id,status,total_count,processed_count,imported_count,skipped_count,failed_count,last_checkpoint_product_code,error_message";

const toProgress = (row: SessionRow): DosoImportSessionProgress => ({
  session_id: row.id,
  status: row.status,
  total_count: row.total_count,
  processed_count: row.processed_count,
  imported_count: row.imported_count,
  skipped_count: row.skipped_count,
  failed_count: row.failed_count,
  last_checkpoint_product_code: row.last_checkpoint_product_code,
  error_message: row.error_message,
});

export async function createImportSession(input: {
  adminUserId?: string | null;
  targetUrl: string;
  totalCount?: number;
  status?: DosoImportSessionStatus;
}) {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("doso_import_sessions")
    .insert({
      admin_user_id: input.adminUserId || null,
      target_url: input.targetUrl,
      status: input.status || "pending",
      total_count: input.totalCount || 0,
    })
    .select(SESSION_SELECT)
    .single<SessionRow>();

  if (error || !data) {
    throw new Error(error?.message || "failed to create import session");
  }

  return toProgress(data);
}

export async function bulkInsertImportItems(sessionId: number, products: DosoImportProduct[]) {
  if (products.length === 0) return;
  const admin = supabaseAdmin();
  const rows = products.map((p) => ({
    session_id: sessionId,
    product_code: p.productCode,
    status: "pending",
    payload: p,
  }));

  const { error } = await admin
    .from("doso_import_items")
    .upsert(rows, { onConflict: "session_id,product_code", ignoreDuplicates: true });
  if (error) {
    throw new Error(error.message);
  }
}

export async function getSessionById(sessionId: number, adminUserId?: string | null) {
  const admin = supabaseAdmin();
  let query = admin
    .from("doso_import_sessions")
    .select(SESSION_SELECT)
    .eq("id", sessionId);

  if (adminUserId) {
    query = query.eq("admin_user_id", adminUserId);
  }

  const { data, error } = await query.maybeSingle<SessionRow>();

  if (error) {
    throw new Error(error.message);
  }
  return data ? toProgress(data) : null;
}

export async function getLatestOpenSession(adminUserId?: string | null) {
  const admin = supabaseAdmin();
  let query = admin
    .from("doso_import_sessions")
    .select(SESSION_SELECT)
    .in("status", ["pending", "running", "paused"])
    .order("created_at", { ascending: false })
    .limit(1);

  if (adminUserId) {
    query = query.eq("admin_user_id", adminUserId);
  }

  const { data, error } = await query.maybeSingle<SessionRow>();
  if (error) {
    throw new Error(error.message);
  }

  return data ? toProgress(data) : null;
}

export async function listPendingItems(sessionId: number, limit = 20) {
  const admin = supabaseAdmin();
  const { data, error } = await admin.rpc("claim_doso_import_pending_items", {
    p_session_id: sessionId,
    p_limit: limit,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data as ImportItemRow[] | null) || [];
}

export async function markItemImported(input: {
  itemId: number;
}) {
  await markItemOutcome({
    itemId: input.itemId,
    status: "imported",
    reason: null,
  });
}

export async function markItemSkipped(input: {
  itemId: number;
  reason: string;
}) {
  await markItemOutcome({
    itemId: input.itemId,
    status: "skipped_existing",
    reason: input.reason,
  });
}

export async function markItemFailed(input: {
  itemId: number;
  reason: string;
}) {
  await markItemOutcome({
    itemId: input.itemId,
    status: "failed",
    reason: input.reason,
  });
}

async function markItemOutcome(input: {
  itemId: number;
  status: "imported" | "skipped_existing" | "failed";
  reason: string | null;
}) {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("doso_import_items")
    .update({
      status: input.status,
      reason: input.reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.itemId)
    .in("status", ["pending", "running"])
    .select("id")
    .maybeSingle<{ id: number }>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("item is not pending or running");
  }

}

export async function updateSessionCounters(sessionId: number) {
  const admin = supabaseAdmin();

  const { data, error } = await admin.rpc("recompute_doso_import_session_counters", {
    p_session_id: sessionId,
  });

  const row = Array.isArray(data) ? (data[0] as SessionRow | undefined) : undefined;

  if (error || !row) {
    throw new Error(error?.message || "failed to persist session counters");
  }

  return toProgress(row);
}

export async function markSessionStatus(input: {
  sessionId: number;
  status: DosoImportSessionStatus;
  errorMessage?: string | null;
}) {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("doso_import_sessions")
    .update({
      status: input.status,
      error_message: input.errorMessage || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.sessionId)
    .select(SESSION_SELECT)
    .single<SessionRow>();

  if (error || !data) {
    throw new Error(error?.message || "failed to update session status");
  }

  return toProgress(data);
}
