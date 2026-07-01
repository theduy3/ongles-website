import type { StoreSettings, CustomCodeSnippet } from "@/lib/store-settings-schema";
import { pruneEmpty } from "@/lib/prune-empty";

// Assembles a sparse StoreSettings doc from the form's working state.
// Only sections / fields that carry a real value are included so that
// static tenant-config defaults shine through (empty string → omit, 0
// numbers → omit, empty arrays → omit, objects with all-undefined values
// → omit).  This is the ONLY place that decides what gets persisted —
// the server re-validates via StoreSettingsSchema before writing.

export interface SeoDraft {
  meta: Record<string, string>;
  services: Record<string, Record<string, string>>;
  gallery: Record<string, Record<string, string>>;
  org: Record<string, string>;
}

export interface SettingsDraftState {
  site: NonNullable<StoreSettings["site"]>;
  services: NonNullable<StoreSettings["services"]>;
  // Full nested SEO override mirroring seo.json, persisted to the SEPARATE `seo`
  // namespace (not `content`). Pruned sparsely by buildSparseDoc.
  seoFr: SeoDraft;
  seoEn: SeoDraft;
  customCode: CustomCodeSnippet[];
}

export function emptySeoDraft(): SeoDraft {
  return { meta: {}, services: {}, gallery: {}, org: {} };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Build a sparse StoreSettings doc from the draft state. Generic value fields are
 * pruned by pruneEmpty (drop undefined/null/""/[]/{}, keep 0/false); three fields
 * keep explicit semantic filters that generic-empty can't express:
 *   - hours:      an entry is valid only with days + opens + closes
 *   - services:   an item is kept only when it carries a non-id value override
 *   - customCode: the array is source-of-truth; blank-code rows are dropped
 * Note: pruneEmpty also strips blank entries out of generic arrays (e.g. a blank
 * socialProfiles URL) — a deliberate improvement over the old field-by-field walk,
 * which only checked array length, not per-item emptiness.
 * The server re-validates the result via StoreSettingsSchema before writing.
 */
export function buildSparseDoc(draft: SettingsDraftState): StoreSettings {
  const doc: StoreSettings = {};

  // ── site ── generic prune of every value field EXCEPT hours (custom validity).
  const { hours, ...siteRest } = draft.site;
  const prunedSite =
    (pruneEmpty(siteRest) as NonNullable<StoreSettings["site"]> | undefined) ?? {};
  const validHours = (hours ?? []).filter(
    (h) => h.days.length > 0 && h.opens && h.closes,
  );
  if (validHours.length > 0) prunedSite.hours = validHours;
  if (Object.keys(prunedSite).length > 0) doc.site = prunedSite;

  // ── services ── keep only items with at least one non-id value override.
  const validServices = draft.services.filter((s) =>
    Object.entries(s)
      .filter(([k]) => k !== "id")
      .some(([, v]) => v !== undefined),
  );
  if (validServices.length > 0) doc.services = validServices;

  // ── seo ── generic prune of the nested SeoDraft records per locale.
  const seo: NonNullable<StoreSettings["seo"]> = {};
  const frSeo = pruneEmpty(draft.seoFr);
  if (frSeo) seo.fr = frSeo as unknown as Record<string, unknown>;
  const enSeo = pruneEmpty(draft.seoEn);
  if (enSeo) seo.en = enSeo as unknown as Record<string, unknown>;
  if (Object.keys(seo).length > 0) doc.seo = seo;

  // ── customCode ── array is source of truth; drop blank-code rows.
  const validCode = draft.customCode.filter((s) => s.code.trim() !== "");
  if (validCode.length > 0) doc.customCode = validCode;

  return doc;
}

/** Extract the nested SeoDraft from a seo locale override (may be absent). */
export function extractSeo(locale: Record<string, unknown> | undefined): SeoDraft {
  const src = locale ?? {};
  const flat = (o: unknown): Record<string, string> => {
    if (!isPlainObject(o)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(o)) if (typeof v === "string") out[k] = v;
    return out;
  };
  const nested = (o: unknown): Record<string, Record<string, string>> => {
    if (!isPlainObject(o)) return {};
    const out: Record<string, Record<string, string>> = {};
    for (const [id, fields] of Object.entries(o)) out[id] = flat(fields);
    return out;
  };
  return {
    meta: flat(src.meta),
    services: nested(src.services),
    gallery: nested(src.gallery),
    org: flat(src.org),
  };
}
