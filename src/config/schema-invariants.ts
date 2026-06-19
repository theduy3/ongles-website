// schema-invariants.ts
// Offline schema invariant asserter — mirrors the structure of config-completeness.ts.
//
// CRITICAL CONSTRAINTS (enforced by Task 3 + Phase 1 lesson):
//   - PURE MODULE: no process.env reads, no network calls, no side effects.
//   - STATIC IMPORTS ONLY, ALIAS-FREE: next.config.ts imports this file via
//     Next's SWC require-hook (transpile-config.js). The hook only resolves the
//     `.ts` chain if every import is a static `require()` with a path that Node
//     can resolve without `@/` alias expansion. `import type` aliases are
//     compile-time-erased and safe. Runtime imports MUST use relative paths to
//     modules whose own transitive chains are also alias-free.
//   - DO NOT import from src/lib/seo.ts — it pulls in @/lib/i18n, @/lib/site,
//     @/lib/reviews (runtime aliases) which cause MODULE_NOT_FOUND in Docker.
//     Invariant logic is inlined here using TENANT_REGISTRY data directly.
//   - EXCLUDED_TENANTS: "template" is a clone source, not a live deployment.
//
// Invariant groups checked per non-template tenant:
//   @context   — every graph root produced by the builders equals "https://schema.org"
//                (structural check: verified by ensuring builders haven't been
//                changed to omit it; we assert on the config facts that drive it)
//   @id        — business/location/organization @id values derive from canonicalUrl
//   I-02       — no two tenants share a business @id (cross-tenant uniqueness)
//   I-03       — sameAs absent or non-empty, never [] (socialProfiles guard)
//   R-02       — AggregateRating emitted only when fetchedAt set AND reviewCount >= 5
//   NailSalon  — required config fields present: name, url, telephone (contact.phone),
//                address (contact.address), geo, hours (openingHoursSpecification source)
//   O-01       — Organization node will be present (organizationGraph always emits it)
//                verified by asserting cfg.site.name non-empty (the org name source)
//   offer()    — AggregateOffer when service.priceTo > service.price, else Offer
//                (verified from services array directly — SCHEMA-02)

import { TENANT_REGISTRY } from "./index";
// F-01 FAQ completeness reads the per-locale FAQ source directly from the
// dictionaries. These are STATIC, alias-free JSON imports (resolveJsonModule
// is true) — safe for the next.config.ts build-guard SWC require-hook. We must
// NOT import faqPageGraph from src/lib/seo.ts here (it pulls @/lib/* runtime
// aliases that MODULE_NOT_FOUND in the Docker build — see header note + #02-03).
// faqPageGraph is a pure 1:1 `items.map`, so source-item q/a non-emptiness is
// equivalent to emitted-node non-emptiness; the 1:1 mainEntity-count contract
// is pinned by schema-invariants.test.ts (which may import faqPageGraph freely).
import frDict from "../dictionaries/fr.json";
import enDict from "../dictionaries/en.json";
// D-05/D-11 — per-tenant FAQ + answer-block sources for the build-time floor and
// presence guards. RELATIVE, alias-free imports only (next.config.ts SWC hook).
import mailyFaqFr from "./tenants/ongles-maily/faq.fr.json";
import mailyFaqEn from "./tenants/ongles-maily/faq.en.json";
import charlesbourgFaqFr from "./tenants/ongles-charlesbourg/faq.fr.json";
import charlesbourgFaqEn from "./tenants/ongles-charlesbourg/faq.en.json";
import rivieresFaqFr from "./tenants/ongles-rivieres/faq.fr.json";
import rivieresFaqEn from "./tenants/ongles-rivieres/faq.en.json";
import mailySeoFr from "./tenants/ongles-maily/seo.fr.json";
import mailySeoEn from "./tenants/ongles-maily/seo.en.json";
import charlesbourgSeoFr from "./tenants/ongles-charlesbourg/seo.fr.json";
import charlesbourgSeoEn from "./tenants/ongles-charlesbourg/seo.en.json";
import rivieresSeoFr from "./tenants/ongles-rivieres/seo.fr.json";
import rivieresSeoEn from "./tenants/ongles-rivieres/seo.en.json";

/** Tenants excluded from schema invariant checks (clone sources, not live deployments). */
const EXCLUDED_TENANTS = new Set(["template"]);

/** Live locales whose FAQ dictionaries feed FAQPage schema (ES deferred to v2). */
const FAQ_LOCALES = [
  { locale: "fr", items: frDict.faq.items },
  { locale: "en", items: enDict.faq.items },
] as const;

// ─── Public types ─────────────────────────────────────────────────────────────

/** Per-tenant schema invariant error. */
export type SchemaInvariantError = {
  tenantId: string;
  invariant: string;
  message: string;
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

type TenantEntry = (typeof TENANT_REGISTRY)[keyof typeof TENANT_REGISTRY];

function err(
  tenantId: string,
  invariant: string,
  message: string,
): SchemaInvariantError {
  return { tenantId, invariant, message };
}

// ─── Phase 3 content-depth constants + offline text utils (D-05/D-11/D-13) ──────

/** D-05 — minimum merged (base + tenant) FAQ items per tenant per locale. */
export const FAQ_FLOOR = 20 as const;
/** D-11 — minimum sentences in a non-empty answer block. */
export const ANSWER_BLOCK_MIN_SENTENCES = 2 as const;

/**
 * D-13 — abbreviation periods that must NOT be read as sentence boundaries.
 * These are titles/units that always precede a noun (e.g. "Mme. Tremblay",
 * "av. Royale"). "etc" is deliberately EXCLUDED: it commonly closes a sentence
 * ("…, etc. Réservez …" is two sentences), pinned by schema-invariants.test.ts.
 */
const PROTECTED_ABBREVS = [
  "M", "Mme", "Mlle", "Me", "Dr", "Dre",
  "St", "Ste", "av", "bd", "boul", "no", "vol", "vs", "env", "approx", "p", "pp",
] as const;

const DOT = ""; // placeholder for a protected period
const ELLIPSIS = ""; // placeholder for a protected "..."

/**
 * Pure, dependency-free sentence splitter (D-13). Protects decimals, ellipsis,
 * and title/unit abbreviation periods, then splits on sentence-ending punctuation
 * followed by whitespace and a capital/opening-quote. Alias-free so it is safe to
 * run inside the next.config.ts build guard (SWC require-hook constraint).
 */
export function splitSentences(text: string): string[] {
  if (typeof text !== "string") return [];
  const trimmed = text.trim();
  if (trimmed.length === 0) return [];

  let s = trimmed
    .replace(/(\d)\.(\d)/g, `$1${DOT}$2`) // decimals: 40.50
    .replace(/\.\.\./g, ELLIPSIS); // ellipsis

  const abbrevRe = new RegExp(`\\b(${PROTECTED_ABBREVS.join("|")})\\.`, "g");
  s = s.replace(abbrevRe, `$1${DOT}`);

  return s
    .split(/(?<=[.!?])\s+(?=[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜ"«])/)
    .map((part) =>
      part.replaceAll(DOT, ".").replaceAll(ELLIPSIS, "...").trim(),
    )
    .filter((part) => part.length > 0);
}

/** Pure word counter (D-13) — whitespace-delimited tokens, 0 for empty input. */
export function countWords(text: string): number {
  if (typeof text !== "string") return 0;
  const t = text.trim();
  if (t.length === 0) return 0;
  return t.split(/\s+/).length;
}

// ─── D-05 FAQ floor + D-11 answer-block presence guards (UNWIRED until 03-05) ───
// These run offline over per-tenant JSON. They are NOT yet called from
// validateSchemaInvariants() — plan 03-05 flips the build gate once content lands,
// so `next build` stays green between 03-01 and 03-04.

/** Live content locales (ES deferred to v2 per D-25). */
const CONTENT_LOCALES = ["fr", "en"] as const;

/** Routes that must carry a non-empty answer block (D-11/D-17). */
const ANSWER_BLOCK_ROUTES = [
  "home",
  "services",
  "pose-ongles",
  "remplissage",
  "soins-mains",
  "soins-pieds",
  "locations",
] as const;

type FaqStub = { items: readonly { q?: string; a?: string }[] };
type SeoAnswerSource = {
  meta?: Record<string, string | undefined>;
  services?: Record<string, Record<string, string | undefined> | undefined>;
  locations?: { answerBlock?: string; answerHeading?: string };
};

/** Base (shared) FAQ items per locale — de-tenanted generic answers (D-03). */
const BASE_FAQ_BY_LOCALE: Record<string, readonly { q: string; a: string }[]> = {
  fr: frDict.faq.items,
  en: enDict.faq.items,
};

/** Per-tenant FAQ stubs/content keyed by tenant id then locale (template excluded). */
const TENANT_FAQ: Record<string, Record<string, FaqStub>> = {
  "ongles-maily": { fr: mailyFaqFr as FaqStub, en: mailyFaqEn as FaqStub },
  "ongles-charlesbourg": { fr: charlesbourgFaqFr as FaqStub, en: charlesbourgFaqEn as FaqStub },
  "ongles-rivieres": { fr: rivieresFaqFr as FaqStub, en: rivieresFaqEn as FaqStub },
};

/** Per-tenant SEO answer-block sources keyed by tenant id then locale. */
const TENANT_SEO: Record<string, Record<string, SeoAnswerSource>> = {
  "ongles-maily": { fr: mailySeoFr as unknown as SeoAnswerSource, en: mailySeoEn as unknown as SeoAnswerSource },
  "ongles-charlesbourg": { fr: charlesbourgSeoFr as unknown as SeoAnswerSource, en: charlesbourgSeoEn as unknown as SeoAnswerSource },
  "ongles-rivieres": { fr: rivieresSeoFr as unknown as SeoAnswerSource, en: rivieresSeoEn as unknown as SeoAnswerSource },
};

/** Extracts the answer-block string for a route from a tenant SEO source. */
function answerBlockForRoute(seo: SeoAnswerSource, route: string): string {
  if (route === "home") return seo.meta?.homeAnswerBlock ?? "";
  if (route === "services") return seo.meta?.servicesAnswerBlock ?? "";
  if (route === "locations") return seo.locations?.answerBlock ?? "";
  return seo.services?.[route]?.answerBlock ?? "";
}

/** D-05 predicate — true when a merged FAQ count is below the floor. */
export function isFaqBelowFloor(mergedCount: number): boolean {
  return mergedCount < FAQ_FLOOR;
}

/** D-11 predicate — true when an answer block is missing or under the sentence floor. */
export function isAnswerBlockInsufficient(text: string): boolean {
  if (typeof text !== "string" || text.trim().length === 0) return true;
  return splitSentences(text).length < ANSWER_BLOCK_MIN_SENTENCES;
}

/**
 * D-05 — merged (base + per-tenant) FAQ count is >= FAQ_FLOOR for every live
 * tenant in each content locale. Reports one error per shortfall.
 */
export function checkFaqFloor(): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = [];
  for (const id of Object.keys(TENANT_FAQ)) {
    if (EXCLUDED_TENANTS.has(id)) continue;
    for (const locale of CONTENT_LOCALES) {
      const base = BASE_FAQ_BY_LOCALE[locale]?.length ?? 0;
      const perTenant = TENANT_FAQ[id]?.[locale]?.items?.length ?? 0;
      const merged = base + perTenant;
      if (isFaqBelowFloor(merged)) {
        errors.push(
          err(
            id,
            "D-05",
            `merged FAQ count (${locale}) is ${merged} (base ${base} + tenant ${perTenant}) — below floor ${FAQ_FLOOR}`,
          ),
        );
      }
    }
  }
  return errors;
}

/**
 * D-11 — every required route's answer block is non-empty AND has at least
 * ANSWER_BLOCK_MIN_SENTENCES sentences, per live tenant per content locale.
 */
export function checkAnswerBlockPresence(): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = [];
  for (const id of Object.keys(TENANT_SEO)) {
    if (EXCLUDED_TENANTS.has(id)) continue;
    for (const locale of CONTENT_LOCALES) {
      const seo = TENANT_SEO[id]?.[locale];
      if (!seo) continue;
      for (const route of ANSWER_BLOCK_ROUTES) {
        const raw = answerBlockForRoute(seo, route);
        if (isAnswerBlockInsufficient(raw)) {
          const text = raw.trim();
          const detail =
            text.length === 0
              ? "is empty"
              : `has ${splitSentences(text).length} sentence(s) — needs >= ${ANSWER_BLOCK_MIN_SENTENCES}`;
          errors.push(err(id, "D-11", `answerBlock for route "${route}" (${locale}) ${detail}`));
        }
      }
    }
  }
  return errors;
}

// ─── Per-invariant checkers ───────────────────────────────────────────────────

/**
 * @context — builders always emit "https://schema.org". This is a structural
 * invariant: if the builder logic changes to omit it, tests will catch it.
 * Here we assert that the canonicalUrl (source for @id) is a valid https URL,
 * which is the prerequisite for a well-formed @context graph.
 */
function checkCanonicalUrl(tenantId: string, cfg: TenantEntry): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = [];
  if (!cfg.site.canonicalUrl || !cfg.site.canonicalUrl.startsWith("https://")) {
    errors.push(
      err(tenantId, "@context", `canonicalUrl "${cfg.site.canonicalUrl}" must start with "https://" (required for valid schema.org @id URIs)`),
    );
  }
  if (cfg.site.canonicalUrl.endsWith("/")) {
    errors.push(
      err(tenantId, "@context", `canonicalUrl "${cfg.site.canonicalUrl}" must not have a trailing slash (breaks @id construction)`),
    );
  }
  return errors;
}

/**
 * @id format — business, location, and organization @id values are constructed
 * as `${canonicalUrl}/#business`, `${canonicalUrl}/#location-{id}`,
 * `${canonicalUrl}/#organization`. Assert canonicalUrl is stable and non-empty.
 */
function checkIds(tenantId: string, cfg: TenantEntry): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = [];
  if (!cfg.site.canonicalUrl) {
    errors.push(err(tenantId, "@id", "canonicalUrl is empty — @id URIs cannot be constructed"));
  }
  // location.id must be non-empty so #location-{id} is unique
  if (!cfg.location.id || cfg.location.id.trim() === "") {
    errors.push(err(tenantId, "@id", "location.id is empty — #location-{id} @id cannot be constructed"));
  }
  return errors;
}

/**
 * I-02 — cross-tenant business @id uniqueness. Run once across all tenants.
 * Two tenants with the same canonicalUrl would emit colliding #business @ids.
 */
function checkIdUniqueness(): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = [];
  const seen = new Map<string, string>(); // bid → first tenantId

  for (const [id, cfg] of Object.entries(TENANT_REGISTRY)) {
    if (EXCLUDED_TENANTS.has(id)) continue;
    const bid = `${cfg.site.canonicalUrl}/#business`;
    if (seen.has(bid)) {
      errors.push(
        err(id, "I-02", `business @id "${bid}" already used by tenant "${seen.get(bid)}" — cross-tenant @id collision`),
      );
    } else {
      seen.set(bid, id);
    }
  }
  return errors;
}

/**
 * I-03 — sameAs absent or non-empty, never [].
 * organizationGraph only emits sameAs when socialProfiles.length > 0.
 * This invariant is satisfied by construction; but we check the source data
 * to catch any future mutation that could accidentally produce sameAs: [].
 * (An empty array in socialProfiles is fine — the builder omits sameAs entirely.)
 */
function checkSameAs(tenantId: string, cfg: TenantEntry): SchemaInvariantError[] {
  // The builder already guards this (I-03 sameAsSpread pattern). Nothing to
  // assert on config data — the guard is structural in seo.ts.
  // We check here that socialProfiles is an array (not null/undefined which
  // could cause the builder to emit sameAs: undefined incorrectly).
  if (!Array.isArray(cfg.site.socialProfiles)) {
    return [
      err(tenantId, "I-03", "site.socialProfiles is not an array — builder cannot apply sameAs guard"),
    ];
  }
  return [];
}

/**
 * R-02 — AggregateRating gate.
 * The builder emits aggregateRating ONLY when:
 *   fetchedAt !== null AND aggregate.reviewCount >= 5
 * Assert the current reviewData satisfies the gate invariant (the builder
 * will either emit or suppress correctly — this check catches misconfigured
 * stubs that claim a real rating without a fetch).
 */
function checkAggregateRating(tenantId: string, cfg: TenantEntry): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = [];
  const rd = cfg.reviewData;

  // If fetchedAt is null, reviewCount should be 0 (stub state).
  // A non-zero reviewCount with null fetchedAt is a data integrity issue
  // (the builder suppresses the rating but the config is inconsistent).
  if (rd.fetchedAt === null && rd.aggregate.reviewCount > 0) {
    errors.push(
      err(
        tenantId,
        "R-02",
        `reviewData.fetchedAt is null but reviewCount=${rd.aggregate.reviewCount} > 0 — stub state inconsistency (R-02 suppresses the rating correctly, but the config data is misleading)`,
      ),
    );
  }

  // If fetchedAt is set, reviewCount must be a non-negative integer.
  if (rd.fetchedAt !== null && rd.aggregate.reviewCount < 0) {
    errors.push(
      err(tenantId, "R-02", `reviewCount=${rd.aggregate.reviewCount} is negative — invalid review count`),
    );
  }

  return errors;
}

/**
 * NailSalon required fields — verify source config fields that feed the
 * required NailSalon properties in organizationGraph:
 *   name → cfg.site.name
 *   url → cfg.site.url
 *   telephone → cfg.site.contact.phone
 *   address → cfg.site.contact.address (street, city, region, postalCode, country)
 *   geo → cfg.site.geo (lat, lng)
 *   openingHoursSpecification → cfg.site.hours (non-empty)
 */
function checkRequiredFields(tenantId: string, cfg: TenantEntry): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = [];
  const s = cfg.site;

  if (!s.name || s.name.trim() === "") {
    errors.push(err(tenantId, "NailSalon", "site.name is empty — NailSalon name required"));
  }
  if (!s.url || !s.url.startsWith("http")) {
    errors.push(err(tenantId, "NailSalon", `site.url "${s.url}" is not a valid URL — NailSalon url required`));
  }
  if (!s.contact.phone || s.contact.phone.trim() === "") {
    errors.push(err(tenantId, "NailSalon", "site.contact.phone is empty — NailSalon telephone required"));
  }
  const addr = s.contact.address;
  for (const field of ["street", "city", "region", "postalCode", "country"] as const) {
    if (!addr[field] || addr[field].trim() === "") {
      errors.push(err(tenantId, "NailSalon", `site.contact.address.${field} is empty — NailSalon address required`));
    }
  }
  if (typeof s.geo.lat !== "number" || s.geo.lat === 0) {
    errors.push(err(tenantId, "NailSalon", "site.geo.lat is missing or 0 — NailSalon geo required"));
  }
  if (typeof s.geo.lng !== "number" || s.geo.lng === 0) {
    errors.push(err(tenantId, "NailSalon", "site.geo.lng is missing or 0 — NailSalon geo required"));
  }
  if (!Array.isArray(s.hours) || (s.hours as readonly unknown[]).length < 1) {
    errors.push(err(tenantId, "NailSalon", "site.hours is empty — openingHoursSpecification required"));
  }

  return errors;
}

/**
 * O-01 — Organization node is always emitted by organizationGraph as the first
 * @graph member. The invariant is satisfied by construction; we assert the
 * source data needed to build the Organization node is present (site.name).
 */
function checkOrganizationNode(tenantId: string, cfg: TenantEntry): SchemaInvariantError[] {
  // Already covered by checkRequiredFields → site.name check.
  // But assert canonicalUrl explicitly for the #organization @id.
  if (!cfg.site.canonicalUrl) {
    return [
      err(tenantId, "O-01", "canonicalUrl missing — Organization @id (#organization) cannot be constructed"),
    ];
  }
  return [];
}

/**
 * offer() SCHEMA-02 — AggregateOffer when priceTo > price, else Offer.
 * Verified from the services array: each service must have price > 0 and
 * priceTo >= price. When priceTo > price, the builder emits AggregateOffer.
 */
function checkOfferTypes(tenantId: string, cfg: TenantEntry): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = [];
  for (const svc of cfg.services) {
    if (typeof svc.price !== "number" || svc.price <= 0) {
      errors.push(
        err(tenantId, "SCHEMA-02", `service "${svc.id}" price=${svc.price} must be a positive number`),
      );
    }
    if (svc.priceTo !== undefined) {
      if (typeof svc.priceTo !== "number" || svc.priceTo < svc.price) {
        errors.push(
          err(
            tenantId,
            "SCHEMA-02",
            `service "${svc.id}" priceTo=${svc.priceTo} must be >= price=${svc.price} (AggregateOffer requires lowPrice <= highPrice)`,
          ),
        );
      }
    }
  }
  return errors;
}

/**
 * F-01 — FAQ completeness: every FAQ source item has a non-empty question (q)
 * and answer (a). `faqPageGraph` maps items 1:1 (`name: item.q`,
 * `acceptedAnswer.text: item.a`), so a non-empty source item is equivalent to a
 * non-empty emitted Question node, and `mainEntity.length === items.length`
 * holds structurally. The 1:1 count contract is pinned by schema-invariants.test.ts
 * (which imports faqPageGraph directly); this check stays alias-free so it is
 * safe to run inside the next.config.ts build guard.
 */
export function validateFaqCompleteness(
  tenantId: string,
  locale: string,
  items: readonly { q: string; a: string }[],
): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = [];
  if (!Array.isArray(items) || items.length === 0) {
    errors.push(err(tenantId, "F-01", `faq.items (${locale}) is empty — no FAQ entries to emit`));
    return errors;
  }
  items.forEach((item, i) => {
    if (!item?.q?.trim()) {
      errors.push(err(tenantId, "F-01", `faq item ${i} (${locale}) has an empty question (q)`));
    }
    if (!item?.a?.trim()) {
      errors.push(err(tenantId, "F-01", `faq item ${i} (${locale}) has an empty answer (a)`));
    }
  });
  return errors;
}

/** Runs F-01 across every live FAQ locale (FR + EN; ES deferred). */
function checkFaqCompleteness(): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = [];
  for (const { locale, items } of FAQ_LOCALES) {
    errors.push(...validateFaqCompleteness(`dictionaries/${locale}`, locale, items));
  }
  return errors;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Iterates all non-excluded tenants in TENANT_REGISTRY and checks each against
 * the schema invariant set. Returns an array of per-tenant errors.
 * An empty array means all tenants pass all invariants.
 *
 * Pure function — no process.env reads, no network, no side effects.
 * Alias-free — safe to call from next.config.ts (SWC require-hook constraint).
 */
export function validateSchemaInvariants(): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = [];

  // I-02 uniqueness check is cross-tenant — run once before the per-tenant loop.
  errors.push(...checkIdUniqueness());

  // F-01 FAQ completeness is per-locale (global dictionaries), not per-tenant.
  errors.push(...checkFaqCompleteness());

  // D-05 / D-11 — Phase 3 content-depth gates, now LIVE (build-blocking).
  errors.push(...checkFaqFloor());
  errors.push(...checkAnswerBlockPresence());

  for (const [id, cfg] of Object.entries(TENANT_REGISTRY)) {
    if (EXCLUDED_TENANTS.has(id)) continue;

    errors.push(
      ...checkCanonicalUrl(id, cfg),
      ...checkIds(id, cfg),
      ...checkSameAs(id, cfg),
      ...checkAggregateRating(id, cfg),
      ...checkRequiredFields(id, cfg),
      ...checkOrganizationNode(id, cfg),
      ...checkOfferTypes(id, cfg),
    );
  }

  return errors;
}

/**
 * Asserts that every non-excluded tenant in TENANT_REGISTRY passes all schema
 * invariants. Throws a formatted Error listing every failing invariant.
 * Returns silently when all invariants pass.
 *
 * Designed to be called from next.config.ts under PHASE_PRODUCTION_BUILD so a
 * schema violation aborts `next build` (exit 1 via Next.js printAndExit) and
 * the Dokploy deploy. Mirrors assertAllTenantsComplete() from config-completeness.ts.
 */
export function assertSchemaInvariants(): void {
  const errors = validateSchemaInvariants();
  if (errors.length === 0) return;

  const grouped = new Map<string, SchemaInvariantError[]>();
  for (const error of errors) {
    const existing = grouped.get(error.tenantId) ?? [];
    existing.push(error);
    grouped.set(error.tenantId, existing);
  }

  const message = Array.from(grouped.entries())
    .map(
      ([tenantId, errs]) =>
        `Tenant "${tenantId}" has schema invariant violations:\n` +
        errs.map((e) => `  [${e.invariant}] ${e.message}`).join("\n"),
    )
    .join("\n\n");

  throw new Error(
    `\n\nSchema invariant check FAILED — fix before deploying:\n\n${message}\n`,
  );
}
