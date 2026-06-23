/**
 * Seed Supabase `store_settings` from static tenant config.
 *
 * Publishes each live tenant's current STATIC SEO + site config into the
 * Supabase admin-override layer so `/admin/settings` opens pre-populated and
 * an operator can see and edit the live values (instead of blank fields).
 *
 *   bun run scripts/seed-store-settings.ts            # dry-run: build + validate + print, NO writes
 *   bun run scripts/seed-store-settings.ts --write    # upsert one row per live tenant
 *
 * --write needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the environment
 * (bun auto-loads .env / .env.local). Without them the admin client is null
 * and the script exits cleanly without touching the database.
 *
 * ─── TRADE-OFF (read before running --write) ──────────────────────────────
 * store_settings is a *sparse override* that WINS over static config at the
 * deep-merge layer. Seeding therefore FREEZES these values into the DB: later
 * edits to the static `site.ts` / `seo.*.json` will NOT propagate while a row
 * exists. To re-sync after a static change, either re-run with --write (this
 * re-publishes static, clobbering any operator edits) or delete the tenant's
 * store_settings row to revert to static defaults.
 *
 * The live site already renders the optimized static config — this seed does
 * NOT change live SEO. It only populates the admin form.
 */

import { TENANT_REGISTRY } from "@/config";
import {
  StoreSettingsSchema,
  type StoreSettings,
} from "@/lib/store-settings-schema";
import { getSupabaseAdmin, STORE_SETTINGS_TABLE } from "@/lib/supabase";

import baseFr from "@/config/seo/seo.fr.json";
import baseEn from "@/config/seo/seo.en.json";
import mailyFr from "@/config/tenants/ongles-maily/seo.fr.json";
import mailyEn from "@/config/tenants/ongles-maily/seo.en.json";
import charlesbourgFr from "@/config/tenants/ongles-charlesbourg/seo.fr.json";
import charlesbourgEn from "@/config/tenants/ongles-charlesbourg/seo.en.json";
import rivieresFr from "@/config/tenants/ongles-rivieres/seo.fr.json";
import rivieresEn from "@/config/tenants/ongles-rivieres/seo.en.json";

// Tenants whose admin form we seed. `template` is an empty scaffold — skip it.
const SEED_TENANTS = [
  "ongles-maily",
  "ongles-charlesbourg",
  "ongles-rivieres",
] as const;

type LocaleSeo = { fr: Record<string, unknown>; en: Record<string, unknown> };

const TENANT_SEO: Record<string, LocaleSeo> = {
  "ongles-maily": { fr: mailyFr as Record<string, unknown>, en: mailyEn as Record<string, unknown> },
  "ongles-charlesbourg": { fr: charlesbourgFr as Record<string, unknown>, en: charlesbourgEn as Record<string, unknown> },
  "ongles-rivieres": { fr: rivieresFr as Record<string, unknown>, en: rivieresEn as Record<string, unknown> },
};

const BASE_SEO: LocaleSeo = {
  fr: baseFr as Record<string, unknown>,
  en: baseEn as Record<string, unknown>,
};

// Fields the admin SEO form (SeoSection.tsx) actually edits. We seed ONLY these
// — not the answer blocks / comparison bodies / page copy — so that rich static
// content stays dynamic and is not frozen into the DB.
const SERVICE_FIELDS = ["metaTitle", "metaDescription", "schemaDescription", "heroAlt"] as const;

// ─── helpers ──────────────────────────────────────────────────────────────

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() !== "" ? v : undefined;
}

/** Drop undefined values; return undefined if nothing remains. */
function compact<T extends Record<string, unknown>>(obj: T): Partial<T> | undefined {
  const out: Partial<T> = {};
  for (const k in obj) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Extract the form-editable SEO keys (meta / services / gallery / org) from one
 * merged-static locale, mirroring the shape the admin form reads back.
 */
function buildSeoLocale(base: Record<string, unknown>, tenant: Record<string, unknown>): Record<string, unknown> {
  const baseMeta = isObject(base.meta) ? base.meta : {};
  const tMeta = isObject(tenant.meta) ? tenant.meta : {};
  const baseServices = isObject(base.services) ? base.services : {};
  const tServices = isObject(tenant.services) ? tenant.services : {};
  const baseGallery = isObject(base.gallery) ? base.gallery : {};
  const tGallery = isObject(tenant.gallery) ? tenant.gallery : {};
  const tOrg = isObject(tenant.org) ? tenant.org : {};
  const baseOrg = isObject(base.org) ? base.org : {};

  // meta: every base key, tenant value winning when present.
  const meta: Record<string, string> = {};
  for (const k of Object.keys(baseMeta)) {
    const v = asString(tMeta[k]) ?? asString(baseMeta[k]);
    if (v) meta[k] = v;
  }

  // services: 4 editable fields per service id known to the base.
  const services: Record<string, Record<string, string>> = {};
  for (const id of Object.keys(baseServices)) {
    const baseSvc = isObject(baseServices[id]) ? (baseServices[id] as Record<string, unknown>) : {};
    const tSvc = isObject(tServices[id]) ? (tServices[id] as Record<string, unknown>) : {};
    const fields: Record<string, string> = {};
    for (const f of SERVICE_FIELDS) {
      const v = asString(tSvc[f]) ?? asString(baseSvc[f]);
      if (v) fields[f] = v;
    }
    if (Object.keys(fields).length > 0) services[id] = fields;
  }

  // gallery: alt text per image id known to the base.
  const gallery: Record<string, Record<string, string>> = {};
  for (const id of Object.keys(baseGallery)) {
    const baseImg = isObject(baseGallery[id]) ? (baseGallery[id] as Record<string, unknown>) : {};
    const tImg = isObject(tGallery[id]) ? (tGallery[id] as Record<string, unknown>) : {};
    const alt = asString(tImg.alt) ?? asString(baseImg.alt);
    if (alt) gallery[id] = { alt };
  }

  // org description.
  const orgDesc = asString(tOrg.description) ?? asString(baseOrg.description);

  const locale: Record<string, unknown> = {};
  if (Object.keys(meta).length > 0) locale.meta = meta;
  if (Object.keys(services).length > 0) locale.services = services;
  if (Object.keys(gallery).length > 0) locale.gallery = gallery;
  if (orgDesc) locale.org = { description: orgDesc };
  return locale;
}

/** Pick only the schema-allowed site fields (omits ga4/canonicalUrl/llmsDescription/nav/routes). */
function buildSite(site: Record<string, unknown>): Record<string, unknown> {
  const contactSrc = isObject(site.contact) ? site.contact : {};
  const addrSrc = isObject(contactSrc.address) ? contactSrc.address : {};
  const bookerSrc = isObject(site.booker) ? site.booker : {};
  const reviewsSrc = isObject(site.reviews) ? site.reviews : {};
  const geoSrc = isObject(site.geo) ? site.geo : {};

  const address = compact({
    line1: asString(addrSrc.line1),
    line2: asString(addrSrc.line2),
    street: asString(addrSrc.street),
    city: asString(addrSrc.city),
    region: asString(addrSrc.region),
    postalCode: asString(addrSrc.postalCode),
    country: asString(addrSrc.country),
  });

  const contact = compact({
    email: asString(contactSrc.email),
    phone: asString(contactSrc.phone),
    phoneHref: asString(contactSrc.phoneHref),
    landmark: asString(contactSrc.landmark),
    address,
  });

  const booker = compact({
    brand: asString(bookerSrc.brand),
    giftCertificate: asString(bookerSrc.giftCertificate),
  });

  const reviews = compact({
    ratingValue: typeof reviewsSrc.ratingValue === "number" ? reviewsSrc.ratingValue : undefined,
    reviewCount: typeof reviewsSrc.reviewCount === "number" ? reviewsSrc.reviewCount : undefined,
    bestRating: typeof reviewsSrc.bestRating === "number" ? reviewsSrc.bestRating : undefined,
    source: asString(reviewsSrc.source),
  });

  const geo = compact({
    lat: typeof geoSrc.lat === "number" ? geoSrc.lat : undefined,
    lng: typeof geoSrc.lng === "number" ? geoSrc.lng : undefined,
  });

  const socialProfiles = Array.isArray(site.socialProfiles)
    ? (site.socialProfiles as unknown[]).filter((u): u is string => typeof u === "string")
    : [];

  const hours = Array.isArray(site.hours) ? site.hours : undefined;

  const out = compact({
    name: asString(site.name),
    url: asString(site.url),
    storeId: asString(site.storeId),
    widgetHost: asString(site.widgetHost),
    logo: asString(site.logo),
    favicon: asString(site.favicon),
    booking: asString(site.booking),
    priceRange: asString(site.priceRange),
    booker,
    reviews,
    geo,
    hours,
    contact,
    socialProfiles: socialProfiles.length > 0 ? socialProfiles : undefined,
  });
  return out ?? {};
}

/** Service price/photo overrides keyed by id. */
function buildServices(services: readonly unknown[]): Record<string, unknown>[] {
  return services
    .filter(isObject)
    .map((s) =>
      compact({
        id: asString(s.id),
        price: typeof s.price === "number" ? s.price : undefined,
        priceTo: typeof s.priceTo === "number" ? s.priceTo : undefined,
        photo: typeof s.photo === "boolean" ? s.photo : undefined,
      }),
    )
    .filter((s): s is Record<string, unknown> => s !== undefined && s.id !== undefined);
}

function buildDoc(tenantId: string): StoreSettings {
  const cfg = TENANT_REGISTRY[tenantId as keyof typeof TENANT_REGISTRY] as {
    site: Record<string, unknown>;
    services: readonly unknown[];
  };
  const seo = TENANT_SEO[tenantId];

  const doc: Record<string, unknown> = {
    site: buildSite(cfg.site),
    services: buildServices(cfg.services),
    seo: {
      fr: buildSeoLocale(BASE_SEO.fr, seo.fr),
      en: buildSeoLocale(BASE_SEO.en, seo.en),
    },
  };

  // Validate through the real override schema — throws on any disallowed key.
  return StoreSettingsSchema.parse(doc);
}

function summarize(tenantId: string, doc: StoreSettings): string {
  const siteKeys = doc.site ? Object.keys(doc.site).length : 0;
  const svcCount = doc.services?.length ?? 0;
  const frMeta = doc.seo?.fr && isObject(doc.seo.fr.meta) ? Object.keys(doc.seo.fr.meta).length : 0;
  const enMeta = doc.seo?.en && isObject(doc.seo.en.meta) ? Object.keys(doc.seo.en.meta).length : 0;
  const bytes = JSON.stringify(doc).length;
  return `  ${tenantId.padEnd(22)} site:${siteKeys} fields · services:${svcCount} · seo.fr.meta:${frMeta} · seo.en.meta:${enMeta} · ${bytes}B`;
}

// ─── main ───────────────────────────────────────────────────────────────────

async function main() {
  const write = process.argv.includes("--write");
  console.log(`\nSeed store_settings — ${write ? "WRITE (upsert to Supabase)" : "DRY-RUN (no writes)"}\n`);

  const docs = new Map<string, StoreSettings>();
  for (const id of SEED_TENANTS) {
    try {
      const doc = buildDoc(id);
      docs.set(id, doc);
      console.log(summarize(id, doc));
    } catch (err) {
      console.error(`  ✗ ${id}: failed to build/validate doc:`, err instanceof Error ? err.message : err);
      process.exitCode = 1;
      return;
    }
  }

  if (!write) {
    console.log(`\nDry-run only. Re-run with --write to upsert these ${docs.size} rows.\n`);
    return;
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    console.error(
      "\n✗ Supabase admin client not configured. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY and retry.\n",
    );
    process.exitCode = 1;
    return;
  }

  console.log("");
  for (const [id, doc] of docs) {
    const { error } = await admin
      .from(STORE_SETTINGS_TABLE)
      .upsert({ tenant_id: id, doc, updated_at: new Date().toISOString() }, { onConflict: "tenant_id" });
    if (error) {
      console.error(`  ✗ ${id}: upsert failed — ${error.message}`);
      process.exitCode = 1;
    } else {
      console.log(`  ✓ ${id}: seeded`);
    }
  }
  console.log(
    "\nDone. The app's 60s store-config cache self-heals; reload /admin/settings to see populated fields.\n",
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
