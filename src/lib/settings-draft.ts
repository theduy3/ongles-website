import type { StoreSettings } from "@/lib/store-settings-schema";

// Assembles a sparse StoreSettings doc from the form's working state.
// Only sections / fields that carry a real value are included so that
// static tenant-config defaults shine through (empty string → omit, 0
// numbers → omit, empty arrays → omit, objects with all-undefined values
// → omit).  This is the ONLY place that decides what gets persisted —
// the server re-validates via StoreSettingsSchema before writing.

type SeoMeta = Record<string, unknown>;

export interface SettingsDraftState {
  site: NonNullable<StoreSettings["site"]>;
  services: NonNullable<StoreSettings["services"]>;
  // SEO meta overrides, persisted to the SEPARATE `seo` namespace (not `content`).
  seoFr: SeoMeta;
  seoEn: SeoMeta;
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
  // SEO meta lives in its own top-level namespace, separate from UI `content`.
  const seo: NonNullable<StoreSettings["seo"]> = {};
  const frMeta = omitEmpty(draft.seoFr);
  if (hasKeys(frMeta)) seo.fr = { meta: frMeta };
  const enMeta = omitEmpty(draft.seoEn);
  if (hasKeys(enMeta)) seo.en = { meta: enMeta };
  if (hasKeys(seo)) doc.seo = seo;

  return doc;
}

/** Extract flat meta record from a seo locale override (may be absent). */
export function extractSeoMeta(locale: Record<string, unknown> | undefined): SeoMeta {
  if (!locale) return {};
  const meta = locale["meta"];
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    return meta as SeoMeta;
  }
  return {};
}
