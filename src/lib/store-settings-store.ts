import { tenant } from "@/config";
import { getSupabaseAdmin, getSupabasePublic, STORE_SETTINGS_TABLE } from "@/lib/supabase";
import { StoreSettingsSchema, type StoreSettings } from "@/lib/store-settings-schema";
import { parseWithSchema, type StoreResult } from "@/lib/tenant-store";

// Data access for store settings stored in Supabase. One row per tenant:
// { tenant_id (PK), doc, updated_at } where `doc` is a sparse StoreSettings
// override object validated through StoreSettingsSchema on read.
//
// Every query is scoped to the ACTIVE tenant (tenant.id) via .eq("tenant_id").
// The public client is used for reads (anon key, RLS SELECT-only).
// The admin client is used for reads/writes that require RLS bypass.

type Row = { doc: unknown };

// The already-fetched Supabase read response, as plain data. The pure resolve*
// functions below consume this so the value/envelope DECISION is reachable
// through the seam without a client — the IO shell fetches, they decide.
export type SbRead<T> = { data: T | null; error: { message: string } | null };

// ── Response→value decision (pure, tested through plain data) ─────────────────

// Public read decision: degrade to null on error, missing row, or corrupt doc —
// SILENT, so the request-time caller falls through to the static tenant config.
export function resolvePublicRead(res: SbRead<Row>, label: string): StoreSettings | null {
  if (res.error) return null;
  if (!res.data) return null;
  return parseWithSchema(StoreSettingsSchema, res.data.doc, label);
}

// Admin read decision: LOUD on corruption. A query error or a corrupt stored doc
// becomes `failed` so the operator sees it; a missing row is a legitimate fresh
// tenant (ok:null).
export function resolveAdminRead(
  res: SbRead<Row>,
  label: string,
): StoreResult<StoreSettings | null> {
  if (res.error) return { ok: false, reason: "failed", detail: res.error.message };
  if (!res.data) return { ok: true, data: null };
  const settings = parseWithSchema(StoreSettingsSchema, res.data.doc, label);
  if (settings === null)
    return { ok: false, reason: "failed", detail: "stored doc failed schema validation" };
  return { ok: true, data: settings };
}

// ── Public read ──────────────────────────────────────────────────────────────
// Used at request time to load the override doc. Returns null when Supabase is
// not configured, the query fails, there is no row, or the doc fails to parse.
// Callers fall through to the static tenant config on null.
export async function readStoreSettings(): Promise<StoreSettings | null> {
  const client = getSupabasePublic();
  if (!client) return null;

  // IO shell — query wiring (table, tenant scoping, maybeSingle) is NOT unit-tested
  // (no fake client); e2e/prod covers it. The value DECISION is resolvePublicRead.
  const res = await client
    .from(STORE_SETTINGS_TABLE)
    .select("doc")
    .eq("tenant_id", tenant.id)
    .maybeSingle<Row>();

  if (res.error) console.error("[store-settings-store] read failed:", res.error.message);
  return resolvePublicRead(res, tenant.id);
}

// ── Admin read ───────────────────────────────────────────────────────────────
// Returns StoreResult so the API route can distinguish "not configured" from
// "query failed". Data may be null when no row exists yet (fresh tenant).
export async function getStoreSettings(): Promise<StoreResult<StoreSettings | null>> {
  const client = getSupabaseAdmin();
  if (!client) return { ok: false, reason: "not_configured" };

  // IO shell — query wiring is NOT unit-tested (no fake client); e2e/prod covers
  // it. The envelope DECISION is resolveAdminRead.
  const res = await client
    .from(STORE_SETTINGS_TABLE)
    .select("doc")
    .eq("tenant_id", tenant.id)
    .maybeSingle<Row>();

  return resolveAdminRead(res, tenant.id);
}

// ── Admin upsert ─────────────────────────────────────────────────────────────
// Creates or replaces the tenant's settings row. `doc` is assumed schema-valid
// (validated at the API layer before calling here). Stamps updated_at so the
// admin UI can show a "last saved" time.
export async function upsertStoreSettings(
  doc: StoreSettings,
): Promise<StoreResult<StoreSettings>> {
  const client = getSupabaseAdmin();
  if (!client) return { ok: false, reason: "not_configured" };

  const { error } = await client.from(STORE_SETTINGS_TABLE).upsert(
    {
      tenant_id: tenant.id,
      doc,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id" },
  );

  if (error) return { ok: false, reason: "failed", detail: error.message };
  return { ok: true, data: doc };
}
