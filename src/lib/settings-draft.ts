import type { StoreSettings, CustomCodeSnippet } from "@/lib/store-settings-schema";

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

/** Remove undefined / empty-string values from a shallow record. */
function omitEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k in obj) {
    const v = obj[k];
    if (v !== undefined && v !== "") {
      (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
}

/** True when an object has at least one own enumerable key. */
function hasKeys(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).length > 0;
}

/**
 * Build a sparse StoreSettings doc from the draft state.
 * Returns only the sections / fields that differ from "nothing" so the
 * deep-merge layer doesn't freeze empty values over good static defaults.
 */
export function buildSparseDoc(draft: SettingsDraftState): StoreSettings {
  const doc: StoreSettings = {};

  // ── site ──────────────────────────────────────────────────────────────
  const rawSite = draft.site;
  const site: NonNullable<StoreSettings["site"]> = {};

  if (rawSite.name) site.name = rawSite.name;
  if (rawSite.url) site.url = rawSite.url;
  if (rawSite.storeId) site.storeId = rawSite.storeId;
  if (rawSite.widgetHost) site.widgetHost = rawSite.widgetHost;
  if (rawSite.booking) site.booking = rawSite.booking;
  if (rawSite.priceRange) site.priceRange = rawSite.priceRange;

  if (rawSite.socialProfiles && rawSite.socialProfiles.length > 0)
    site.socialProfiles = rawSite.socialProfiles;

  // booker
  const booker = omitEmpty(rawSite.booker ?? {});
  if (hasKeys(booker)) site.booker = booker as NonNullable<typeof site.booker>;

  // reviews
  const reviews = omitEmpty(
    Object.fromEntries(
      Object.entries(rawSite.reviews ?? {}).filter(([, v]) => v !== undefined && v !== ""),
    ),
  );
  if (hasKeys(reviews)) site.reviews = reviews as NonNullable<typeof site.reviews>;

  // geo
  const geo = omitEmpty(rawSite.geo ?? {});
  if (hasKeys(geo)) site.geo = geo as NonNullable<typeof site.geo>;

  // contact
  const rawContact = rawSite.contact ?? {};
  const contact: NonNullable<typeof site.contact> = {};
  if (rawContact.email) contact.email = rawContact.email;
  if (rawContact.phone) contact.phone = rawContact.phone;
  if (rawContact.phoneHref) contact.phoneHref = rawContact.phoneHref;
  if (rawContact.landmark) contact.landmark = rawContact.landmark;
  const address = omitEmpty(rawContact.address ?? {});
  if (hasKeys(address)) contact.address = address as NonNullable<typeof contact.address>;
  if (hasKeys(contact)) site.contact = contact;

  // hours — only persist when at least one entry has days + opens + closes
  const validHours = (rawSite.hours ?? []).filter(
    (h) => h.days.length > 0 && h.opens && h.closes,
  );
  if (validHours.length > 0) site.hours = validHours;

  if (hasKeys(site)) doc.site = site;

  // ── services ──────────────────────────────────────────────────────────
  // Only items with at least one value override (price / priceTo / photo).
  const validServices = draft.services.filter((s) =>
    Object.entries(s)
      .filter(([k]) => k !== "id")
      .some(([, v]) => v !== undefined),
  );
  if (validServices.length > 0) doc.services = validServices;

  // ── seo ───────────────────────────────────────────────────────────────
  // Full nested SEO override (meta / services / gallery / org), pruned so empty
  // leaves never freeze over good static defaults at the deep-merge layer.
  const seo: NonNullable<StoreSettings["seo"]> = {};
  const frSeo = buildSeoLocale(draft.seoFr);
  if (hasKeys(frSeo)) seo.fr = frSeo;
  const enSeo = buildSeoLocale(draft.seoEn);
  if (hasKeys(enSeo)) seo.en = enSeo;
  if (hasKeys(seo)) doc.seo = seo;

  // ── customCode ────────────────────────────────────────────────────────────
  // The array is the source of truth (not a sparse override). Drop rows with no
  // code; omit the section entirely when nothing remains.
  const validCode = draft.customCode.filter((s) => s.code.trim() !== "");
  if (validCode.length > 0) doc.customCode = validCode;

  return doc;
}

/** Drop undefined / empty-string values from a flat string record. */
function pruneStrings(obj: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k in obj) {
    const v = obj[k];
    if (v !== undefined && v !== "") out[k] = v;
  }
  return out;
}

/** Prune a nested {id: {field: value}} record: drop empty fields, then empty ids. */
function pruneNested(
  obj: Record<string, Record<string, string>>,
): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const id in obj) {
    const fields = pruneStrings(obj[id]);
    if (hasKeys(fields)) out[id] = fields;
  }
  return out;
}

/** Build one locale's sparse seo override from a SeoDraft (empty sections omitted). */
function buildSeoLocale(draft: SeoDraft): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const meta = pruneStrings(draft.meta);
  if (hasKeys(meta)) out.meta = meta;
  const services = pruneNested(draft.services);
  if (hasKeys(services)) out.services = services;
  const gallery = pruneNested(draft.gallery);
  if (hasKeys(gallery)) out.gallery = gallery;
  const org = pruneStrings(draft.org);
  if (hasKeys(org)) out.org = org;
  return out;
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
