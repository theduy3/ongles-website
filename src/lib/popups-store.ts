import { PopupSchema, type Popup } from "@/lib/popup";
import {
  getSupabaseAdmin,
  getSupabasePublic,
  POPUPS_TABLE,
  POPUP_IMAGES_BUCKET,
} from "@/lib/supabase";

// Data access for popups stored in Supabase. Each row is { id, doc, updated_at }
// where `doc` is the full popup object — we reuse PopupSchema (src/lib/popup.ts)
// for both parsing reads and validating writes, so there is a single source of
// truth for the popup shape.

type Row = { id: string; doc: unknown };

// Parse rows through PopupSchema, dropping any that no longer match the schema
// (e.g. a stale row left over from an older shape). Never throws.
function parseRows(rows: Row[]): Popup[] {
  const popups: Popup[] = [];
  for (const row of rows) {
    const parsed = PopupSchema.safeParse(row.doc);
    if (parsed.success) popups.push(parsed.data);
    else console.error(`[popups-store] skipping invalid row ${row.id}:`, parsed.error.issues[0]?.message);
  }
  return popups;
}

// Public read used by GET /api/popups. Returns null when Supabase is not
// configured or the query fails, so the caller can fall back to popups.json.
export async function readPopups(): Promise<Popup[] | null> {
  const client = getSupabasePublic();
  if (!client) return null;
  const { data, error } = await client.from(POPUPS_TABLE).select("id, doc");
  if (error) {
    console.error("[popups-store] read failed:", error.message);
    return null;
  }
  return parseRows((data ?? []) as Row[]);
}

export type StoreResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "not_configured" }
  | { ok: false; reason: "failed"; detail: string };

// Admin: list every popup (active or not) for the editor.
export async function listPopups(): Promise<StoreResult<Popup[]>> {
  const client = getSupabaseAdmin();
  if (!client) return { ok: false, reason: "not_configured" };
  const { data, error } = await client
    .from(POPUPS_TABLE)
    .select("id, doc")
    .order("updated_at", { ascending: false });
  if (error) return { ok: false, reason: "failed", detail: error.message };
  return { ok: true, data: parseRows((data ?? []) as Row[]) };
}

// Admin: create or replace a popup. `popup` must already be PopupSchema-valid.
export async function upsertPopup(popup: Popup): Promise<StoreResult<Popup>> {
  const client = getSupabaseAdmin();
  if (!client) return { ok: false, reason: "not_configured" };
  const { error } = await client
    .from(POPUPS_TABLE)
    .upsert({ id: popup.id, doc: popup, updated_at: new Date().toISOString() });
  if (error) return { ok: false, reason: "failed", detail: error.message };
  return { ok: true, data: popup };
}

export async function deletePopup(id: string): Promise<StoreResult<{ id: string }>> {
  const client = getSupabaseAdmin();
  if (!client) return { ok: false, reason: "not_configured" };
  const { error } = await client.from(POPUPS_TABLE).delete().eq("id", id);
  if (error) return { ok: false, reason: "failed", detail: error.message };
  return { ok: true, data: { id } };
}

// Admin: upload an image to the public bucket and return its public URL.
export async function uploadPopupImage(
  file: File,
): Promise<StoreResult<{ url: string }>> {
  const client = getSupabaseAdmin();
  if (!client) return { ok: false, reason: "not_configured" };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await client.storage
    .from(POPUP_IMAGES_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { ok: false, reason: "failed", detail: error.message };

  const { data } = client.storage.from(POPUP_IMAGES_BUCKET).getPublicUrl(path);
  return { ok: true, data: { url: data.publicUrl } };
}
