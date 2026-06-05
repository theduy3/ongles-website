import { tenant } from "@/config";
import { getSupabaseAdmin, getSupabasePublic, STORE_SETTINGS_TABLE } from "@/lib/supabase";
import { StoreSettingsSchema, type StoreSettings } from "@/lib/store-settings-schema";

// Data access for store settings stored in Supabase. One row per tenant:
// { tenant_id (PK), doc, updated_at } where `doc` is a sparse StoreSettings
// override object validated through StoreSettingsSchema on read.
//
// Every query is scoped to the ACTIVE tenant (tenant.id) via .eq("tenant_id").
// The public client is used for reads (anon key, RLS SELECT-only).
// The admin client is used for reads/writes that require RLS bypass.

// Re-export StoreResult from popups-store to avoid duplication — it is the
// shared contract for all admin-facing data-access functions in this project.
export type { StoreResult } from "@/lib/popups-store";
import type { StoreResult } from "@/lib/popups-store";

type Row = { doc: unknown };

// Parse a single raw DB doc through StoreSettingsSchema. Returns the validated
// StoreSettings or null on parse failure (logs the issue, never throws).
function parseDoc(raw: unknown, label: string): StoreSettings | null {
  const parsed = StoreSettingsSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  console.error(
    `[store-settings-store] invalid doc for ${label}:`,
    parsed.error.issues[0]?.message,
  );
  return null;
}

// ── Public read ──────────────────────────────────────────────────────────────
// Used at request time to load the override doc. Returns null when Supabase is
// not configured, the query fails, there is no row, or the doc fails to parse.
// Callers fall through to the static tenant config on null.
export async function readStoreSettings(): Promise<StoreSettings | null> {
  const client = getSupabasePublic();
  if (!client) return null;

  const { data, error } = await client
    .from(STORE_SETTINGS_TABLE)
    .select("doc")
    .eq("tenant_id", tenant.id)
    .maybeSingle<Row>();

  if (error) {
    console.error("[store-settings-store] read failed:", error.message);
    return null;
  }
  if (!data) return null;

  return parseDoc(data.doc, tenant.id);
}

// ── Admin read ───────────────────────────────────────────────────────────────
// Returns StoreResult so the API route can distinguish "not configured" from
// "query failed". Data may be null when no row exists yet (fresh tenant).
export async function getStoreSettings(): Promise<StoreResult<StoreSettings | null>> {
  const client = getSupabaseAdmin();
  if (!client) return { ok: false, reason: "not_configured" };

  const { data, error } = await client
    .from(STORE_SETTINGS_TABLE)
    .select("doc")
    .eq("tenant_id", tenant.id)
    .maybeSingle<Row>();

  if (error) return { ok: false, reason: "failed", detail: error.message };
  if (!data) return { ok: true, data: null };

  const settings = parseDoc(data.doc, tenant.id);
  // A parse failure on admin read is surfaced as failed so the operator knows
  // their stored doc is corrupt and needs to be fixed.
  if (settings === null)
    return { ok: false, reason: "failed", detail: "stored doc failed schema validation" };

  return { ok: true, data: settings };
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
