import type { z } from "zod";

// Shared seam for tenant-scoped Supabase data access. Two real adapters today —
// popups-store.ts (multi-row collection) and store-settings-store.ts (single-row
// doc per tenant) — differ in query shape (collection vs singleton), so this
// module extracts only what is genuinely atomic and identical across both:
// the admin-facing result envelope, and the validate/log/degrade-to-null parse.

export type StoreResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "not_configured" }
  | { ok: false; reason: "failed"; detail: string };

/**
 * Convert an unexpected public data-read rejection into the null value that
 * callers use to select static fallback content. Supabase normally returns a
 * response envelope for query failures, but transport failures and aborts can
 * reject before that envelope exists.
 */
export async function readPublicOrNull<T>(
  label: string,
  read: () => T | PromiseLike<T>,
): Promise<T | null> {
  try {
    return await read();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`[tenant-store] public read failed (${label}):`, detail);
    return null;
  }
}

// Validates `raw` through `schema`. On success returns the parsed data; on
// failure logs the first issue (tagged with `label` — a row id, a tenant id,
// whatever identifies which doc failed) and returns null. Never throws, so
// callers can degrade (drop a row, fall back to defaults) instead of crashing
// on a stale or malformed stored doc.
export function parseWithSchema<T>(schema: z.ZodType<T>, raw: unknown, label: string): T | null {
  const parsed = schema.safeParse(raw);
  if (parsed.success) return parsed.data;
  console.error(`[tenant-store] invalid doc (${label}):`, parsed.error.issues[0]?.message);
  return null;
}
