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
import { shouldPublishRating, RATING_MIN_REVIEWS } from "./review-honesty";
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

// ─── Phase 4: net-new-page guard constants (LOCKED — do not change without a plan) ──
// These values are the canonical source of truth referenced by checkWordCount,
// checkCrossTenantOverlap, and seo-parity.test.ts. They are exported so tests can
// import and assert on the exact numeric contract.

/** P4 — minimum word count for comparison page body sections (any slug). */
export const COMPARISON_WORD_FLOOR = 200 as const;
/** P4 — minimum word count for nearMe page answerBlock. */
export const NEAR_ME_WORD_FLOOR = 150 as const;
/** P4 — Jaccard sentence-overlap threshold above which two tenants are "too similar". */
export const NEW_PAGE_OVERLAP_THRESHOLD = 0.30 as const;

/** P4 — FR-key slugs for the comparison page namespace in seo JSON. */
const NEW_COMPARISON_SLUGS = [
  "pose-vs-remplissage",
  "manucure-vs-pedicure",
  "gel-vs-acrylique",
  "meilleur-pour",
] as const;

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

/**
 * P4 — Comparison route identifiers that must carry a non-empty answerBlock
 * (≥ ANSWER_BLOCK_MIN_SENTENCES). Activated from 04-04 once all tenant copy lands.
 */
const COMPARISON_ANSWER_BLOCK_ROUTES = NEW_COMPARISON_SLUGS;

type FaqStub = { items: readonly { q?: string; a?: string }[] };
type SeoAnswerSource = {
  meta?: Record<string, string | undefined>;
  services?: Record<string, Record<string, string | undefined> | undefined>;
  locations?: { answerBlock?: string; answerHeading?: string };
  /** Phase 4 — net-new page content namespace (pricing / comparison / nearMe). */
  pages?: {
    pricing?: { answerHeading?: string; answerBlock?: string; metaTitle?: string; metaDescription?: string };
    comparison?: Record<string, { answerHeading?: string; answerBlock?: string; body?: string; metaTitle?: string; metaDescription?: string }>;
    nearMe?: { answerHeading?: string; answerBlock?: string; boroughName?: string; body?: string; metaTitle?: string; metaDescription?: string };
  };
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
  // P4: comparison route answerBlock (pages.comparison[slug].answerBlock)
  const compKeys = NEW_COMPARISON_SLUGS as readonly string[];
  if (compKeys.includes(route)) return seo.pages?.comparison?.[route]?.answerBlock ?? "";
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

// ─── Phase 4: net-new-page guards (EXPORTED, UNWIRED until 04-05) ────────────
//
// These functions are exported and testable offline. They are NOT called from
// validateSchemaInvariants() yet — plan 04-05 flips the build gate after all
// per-tenant content lands. Until then `next build` stays green.
//
// ALIAS-FREE CONSTRAINT: same as the rest of this module — no @/ imports.

/**
 * Pure normalized-sentence Jaccard overlap (P4 / 04-RESEARCH Q3).
 *
 * Algorithm:
 *   1. Lowercase both texts, strip non-word punctuation (keep apostrophes),
 *      collapse whitespace.
 *   2. Split into sentences via splitSentences().
 *   3. Compute Set Jaccard: |intersection| / |union|.
 *
 * Returns 1.0 for identical text, 0 for fully disjoint sets.
 * Exported so tests can assert the overlap algorithm independently.
 */
export function measureSentenceOverlap(textA: string, textB: string): number {
  // Normalize a single sentence (already split) to a canonical form for comparison.
  const normalizeSentence = (s: string): string =>
    s
      .toLowerCase()
      // strip non-word punctuation except apostrophes (French contractions)
      .replace(/[^a-z0-9àâäéèêëîïôùûüœç'\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const sentencesOf = (t: string): Set<string> => {
    // Split first (preserving periods for the splitter), then normalize each sentence.
    const sentences = splitSentences(t);
    return new Set(
      sentences
        .map(normalizeSentence)
        .filter((s) => s.length > 0),
    );
  };

  const setA = sentencesOf(textA);
  const setB = sentencesOf(textB);

  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const s of setA) {
    if (setB.has(s)) intersection++;
  }

  // Jaccard = |A ∩ B| / |A ∪ B|  where |A ∪ B| = |A| + |B| - |A ∩ B|
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * P4 — Word-count floor guard for net-new page bodies.
 *
 * Checks:
 *   - pages.comparison.{slug}.body >= COMPARISON_WORD_FLOOR (200) per tenant per locale
 *   - pages.nearMe.answerBlock >= NEAR_ME_WORD_FLOOR (150) per tenant per locale
 *
 * Reads from TENANT_SEO (module-level, imported per-tenant seo JSON).
 * UNWIRED from validateSchemaInvariants() until 04-05.
 */
export function checkWordCount(): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = [];

  for (const id of Object.keys(TENANT_SEO)) {
    if (EXCLUDED_TENANTS.has(id)) continue;
    for (const locale of CONTENT_LOCALES) {
      const seo = TENANT_SEO[id]?.[locale];
      if (!seo || !seo.pages) continue;

      // Comparison page body floors
      for (const slug of NEW_COMPARISON_SLUGS) {
        const body = seo.pages.comparison?.[slug]?.body ?? "";
        const wc = countWords(body);
        if (wc < COMPARISON_WORD_FLOOR) {
          errors.push(
            err(
              id,
              "P4-wordcount",
              `pages.comparison.${slug}.body (${locale}) has ${wc} words — below floor ${COMPARISON_WORD_FLOOR}`,
            ),
          );
        }
      }

      // NearMe answerBlock floor
      const nearMeBlock = seo.pages.nearMe?.answerBlock ?? "";
      const nearMeWc = countWords(nearMeBlock);
      if (nearMeWc < NEAR_ME_WORD_FLOOR) {
        errors.push(
          err(
            id,
            "P4-wordcount",
            `pages.nearMe.answerBlock (${locale}) has ${nearMeWc} words — below floor ${NEAR_ME_WORD_FLOOR}`,
          ),
        );
      }
    }
  }

  return errors;
}

/**
 * P4 — Cross-tenant sentence overlap guard for nearMe answerBlock.
 *
 * For each pair of live tenants, computes measureSentenceOverlap on
 * pages.nearMe.answerBlock per locale. Reports an error if overlap >=
 * NEW_PAGE_OVERLAP_THRESHOLD (0.30) — indicates insufficient differentiation
 * between tenant copy. UNWIRED from validateSchemaInvariants() until 04-05.
 */
export function checkCrossTenantOverlap(): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = [];
  const ids = Object.keys(TENANT_SEO).filter((id) => !EXCLUDED_TENANTS.has(id));

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const idA = ids[i]!;
      const idB = ids[j]!;
      for (const locale of CONTENT_LOCALES) {
        const blockA = TENANT_SEO[idA]?.[locale]?.pages?.nearMe?.answerBlock ?? "";
        const blockB = TENANT_SEO[idB]?.[locale]?.pages?.nearMe?.answerBlock ?? "";

        // Skip comparison when either block is missing/empty (content not yet authored)
        if (blockA.trim().length === 0 || blockB.trim().length === 0) continue;

        const overlap = measureSentenceOverlap(blockA, blockB);
        if (overlap >= NEW_PAGE_OVERLAP_THRESHOLD) {
          errors.push(
            err(
              idA,
              "P4-overlap",
              `pages.nearMe.answerBlock (${locale}) overlap with "${idB}" is ${overlap.toFixed(2)} — above threshold ${NEW_PAGE_OVERLAP_THRESHOLD}`,
            ),
          );
        }
      }
    }
  }

  return errors;
}

/**
 * P4 04-05 — Route presence guard: asserts each live tenant has its required
 * borough near-me route slug registered in `site.routes`.
 *
 * Pricing (/tarifs, /pricing) and comparison routes (/comparaisons/*, /comparisons/*)
 * are managed centrally via `LOCALIZED_PAGE_PAIRS` in sitemap.ts and are NOT added
 * to per-tenant `site.routes` (per 04-05 plan prohibition). Only the borough
 * near-me route is per-tenant and belongs in site.routes.
 *
 * Borough slug mapping (canonical, locale-agnostic proper nouns — same slug FR+EN):
 *   ongles-maily        → /beauport
 *   ongles-charlesbourg → /charlesbourg
 *   ongles-rivieres     → /trois-rivieres
 *
 * Wired into validateSchemaInvariants() from 04-05.
 */

/** Per-tenant required borough near-me route slug (proper noun — same FR+EN). */
const TENANT_BOROUGH_ROUTE: Record<string, string> = {
  "ongles-maily": "/beauport",
  "ongles-charlesbourg": "/charlesbourg",
  "ongles-rivieres": "/trois-rivieres",
};

export function checkRoutePresence(): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = [];

  for (const [id, cfg] of Object.entries(TENANT_REGISTRY)) {
    if (EXCLUDED_TENANTS.has(id)) continue;

    const expectedSlug = TENANT_BOROUGH_ROUTE[id];
    if (!expectedSlug) continue; // no required borough route for this tenant (future tenant)

    const routes: readonly string[] = cfg.site.routes;
    if (!routes.includes(expectedSlug)) {
      errors.push(
        err(
          id,
          "P4-route",
          `site.routes missing required borough near-me route "${expectedSlug}" — add it to routes[] (not nav[])`,
        ),
      );
    }
  }

  return errors;
}

/**
 * P4 04-04 — Comparison answerBlock presence guard.
 *
 * Checks pages.comparison[slug].answerBlock for each comparison slug has at
 * least ANSWER_BLOCK_MIN_SENTENCES (2) sentences, per tenant per locale.
 * Uses the COMPARISON_ANSWER_BLOCK_ROUTES constant (= NEW_COMPARISON_SLUGS).
 * Called from validateSchemaInvariants() once all comparison copy lands (04-04).
 */
function checkComparisonAnswerBlockPresence(): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = [];
  for (const id of Object.keys(TENANT_SEO)) {
    if (EXCLUDED_TENANTS.has(id)) continue;
    for (const locale of CONTENT_LOCALES) {
      const seo = TENANT_SEO[id]?.[locale];
      if (!seo) continue;
      for (const slug of COMPARISON_ANSWER_BLOCK_ROUTES) {
        const raw = answerBlockForRoute(seo, slug);
        if (isAnswerBlockInsufficient(raw)) {
          const text = raw.trim();
          const detail =
            text.length === 0
              ? "is empty"
              : `has ${splitSentences(text).length} sentence(s) — needs >= ${ANSWER_BLOCK_MIN_SENTENCES}`;
          errors.push(
            err(id, "D-11", `answerBlock for comparison route "${slug}" (${locale}) ${detail}`),
          );
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
export function checkAggregateRating(tenantId: string, cfg: TenantEntry): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = [];
  const rd = cfg.reviewData;

  // Data hygiene: a stub (no genuine fetch) must not advertise a rating count —
  // it is misleading config even though the gate suppresses the rating.
  if (rd.fetchedAt === null && rd.aggregate.reviewCount > 0) {
    errors.push(
      err(
        tenantId,
        "R-02",
        `reviewData.fetchedAt is null but reviewCount=${rd.aggregate.reviewCount} > 0 — stub state inconsistency`,
      ),
    );
  }

  // Cross the SHARED gate: when shouldPublishRating (the exact predicate the
  // builder uses) WOULD publish an AggregateRating, the ratingValue the builder
  // emits verbatim must be within 1..bestRating. This asserts the real gate on
  // real config — reachable for any genuinely-fetched tenant — and keeps the
  // validator and builder from drifting on when/what R-02 publishes.
  if (shouldPublishRating(rd)) {
    const best = cfg.site.reviews.bestRating;
    if (rd.aggregate.ratingValue <= 0 || rd.aggregate.ratingValue > best) {
      errors.push(
        err(
          tenantId,
          "R-02",
          `gate would publish ratingValue=${rd.aggregate.ratingValue} outside 1..${best} (min ${RATING_MIN_REVIEWS} reviews met)`,
        ),
      );
    }
  }

  // A genuine fetch with a negative count is invalid data.
  if (rd.fetchedAt !== null && rd.aggregate.reviewCount < 0) {
    errors.push(err(tenantId, "R-02", `reviewCount=${rd.aggregate.reviewCount} is negative — invalid review count`));
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
/**
 * P4 — nearMe word-count gate (LIVE from 04-03).
 *
 * Checks only pages.nearMe.answerBlock >= NEAR_ME_WORD_FLOOR per tenant per
 * locale. The comparison body floor is deferred to 04-05 (activated once all
 * comparison page bodies are authored).
 *
 * This is a narrow scope of checkWordCount() called from validateSchemaInvariants()
 * so the build gate applies to nearMe content only this slice.
 */
function checkNearMeWordCount(): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = [];
  for (const id of Object.keys(TENANT_SEO)) {
    if (EXCLUDED_TENANTS.has(id)) continue;
    for (const locale of CONTENT_LOCALES) {
      const seo = TENANT_SEO[id]?.[locale];
      if (!seo || !seo.pages) continue;
      const nearMeBlock = seo.pages.nearMe?.answerBlock ?? "";
      const nearMeWc = countWords(nearMeBlock);
      if (nearMeWc < NEAR_ME_WORD_FLOOR) {
        errors.push(
          err(
            id,
            "P4-wordcount",
            `pages.nearMe.answerBlock (${locale}) has ${nearMeWc} words — below floor ${NEAR_ME_WORD_FLOOR}`,
          ),
        );
      }
    }
  }
  return errors;
}

// ─── Phase-5 guard functions (05-01) — EXPORTED but UNWIRED ──────────────────
// These four functions are intentionally NOT called from validateSchemaInvariants()
// until 05-05 wires them once owner content lands (mirror the 03/04
// unwired-until-activation pattern in this same file).
//
// ALIAS-FREE: same constraints as the rest of this module.

/**
 * LLMS-02 — llmsDescription depth guard.
 *
 * Returns an error for every non-template tenant whose `site.llmsDescription`
 * is absent or has fewer than 200 words. Currently RED (empty placeholders)
 * until real hand-authored prose is added in 05-05.
 */
/**
 * Minimal structural view of a tenant for the llms guards. Accepting this as an
 * injectable param (default TENANT_REGISTRY) keeps the guards pure while letting
 * tests seed fail-fixtures (gate-bites proof) without mutating real config.
 */
type LlmsTenantView = {
  site: {
    llmsDescription?: string;
    contact: { landmark?: string; address: { city?: string } };
  };
};

export function checkLlmsDepth(
  registry: Record<string, LlmsTenantView> = TENANT_REGISTRY,
): SchemaInvariantError[] {
  const LLMS_WORD_FLOOR = 200;
  const errors: SchemaInvariantError[] = [];
  for (const [id, cfg] of Object.entries(registry)) {
    if (EXCLUDED_TENANTS.has(id)) continue;
    const desc = cfg.site.llmsDescription ?? "";
    const wc = countWords(desc);
    if (wc < LLMS_WORD_FLOOR) {
      errors.push(
        err(
          id,
          "LLMS-02",
          `site.llmsDescription has ${wc} words — below floor ${LLMS_WORD_FLOOR}`,
        ),
      );
    }
  }
  return errors;
}

/**
 * Generic place-name words that are NOT distinctive to a single tenant. Excluded
 * from token-level leak signals so ordinary prose ("centre commercial", "près du
 * carrefour", "boulevard") can never trigger a false-positive leak.
 */
const LLMS_LEAK_STOPWORDS = new Set([
  "carrefour",
  "centre",
  "entree",
  "entrees",
  "entrée",
  "entrées",
  "place",
  "galeries",
  "mail",
  "boulevard",
  "avenue",
  "rue",
  "les",
  "des",
]);

/**
 * Distinctive lowercase tokens from a landmark string (e.g. the borough name
 * "beauport" inside "Carrefour Beauport — Entrées 4 ou 5"). Splits on non-letters
 * (keeping internal hyphens), drops short words, digits, and generic stopwords.
 */
function landmarkTokens(landmark: string): string[] {
  return landmark
    .toLowerCase()
    .split(/[^a-zà-ÿ-]+/)
    .map((t) => t.replace(/^-+|-+$/g, ""))
    .filter((t) => t.length >= 4 && !LLMS_LEAK_STOPWORDS.has(t));
}

/**
 * Membership test for a leak signal in a (lowercased) description. Multi-word
 * phrases (full landmark) use substring match; single tokens use a word-boundary
 * match so a borough token never partial-matches an unrelated word (e.g. the token
 * "fort" must not match "confort").
 */
function descContainsSignal(desc: string, sig: string): boolean {
  if (/\s/.test(sig)) return desc.includes(sig);
  const esc = sig.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-zà-ÿ])${esc}([^a-zà-ÿ]|$)`).test(desc);
}

/**
 * LLMS-01 — Cross-tenant llmsDescription leak guard.
 *
 * Builds a per-tenant "signal" set from each tenant's contact.landmark (full
 * string PLUS distinctive borough tokens), and contact.address.city. Flags any
 * tenant whose llmsDescription contains another tenant's signal — full landmark,
 * a borough token, or a non-shared city — indicating a copy-paste leak.
 *
 * Signals shared with the checking tenant (e.g. a common city like "Québec" for
 * two same-city salons) are skipped — a true shared fact is not a leak.
 */
export function checkLlmsLeak(
  registry: Record<string, LlmsTenantView> = TENANT_REGISTRY,
): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = [];

  // Build signal map: tenantId → lowercase signals (full landmark + distinctive
  // landmark tokens + city). Tokens catch a bare borough name (e.g. "Charlesbourg")
  // that the full-landmark string alone would miss.
  const signals = new Map<string, string[]>();
  for (const [id, cfg] of Object.entries(registry)) {
    if (EXCLUDED_TENANTS.has(id)) continue;
    const s = cfg.site.contact;
    const sigs: string[] = [];
    if (s.landmark) {
      sigs.push(s.landmark.toLowerCase());
      sigs.push(...landmarkTokens(s.landmark));
    }
    if (s.address.city) sigs.push(s.address.city.toLowerCase());
    signals.set(id, [...new Set(sigs)]);
  }

  // Check each tenant's llmsDescription against all OTHER tenants' signals.
  for (const [id, cfg] of Object.entries(registry)) {
    if (EXCLUDED_TENANTS.has(id)) continue;
    const desc = (cfg.site.llmsDescription ?? "").toLowerCase();
    if (!desc) continue; // empty placeholder — nothing to leak

    // A signal shared with the current tenant (e.g. a common city like "Québec"
    // for two same-city salons) is a TRUE fact for this tenant, not a leak. Only
    // a DISTINCTIVE other-tenant signal (its own landmark, or a city this tenant
    // does not share) counts as cross-tenant leakage.
    const ownSigs = new Set(signals.get(id) ?? []);

    for (const [otherId, otherSigs] of signals.entries()) {
      if (otherId === id) continue;
      for (const sig of otherSigs) {
        if (!sig) continue;
        if (ownSigs.has(sig)) continue; // shared signal — not a leak
        if (descContainsSignal(desc, sig)) {
          errors.push(
            err(
              id,
              "LLMS-01",
              `site.llmsDescription contains "${sig}" — this is a signal belonging to tenant "${otherId}" (cross-tenant leak)`,
            ),
          );
          break; // one error per other-tenant is enough
        }
      }
    }
  }
  return errors;
}

/**
 * MEAS-01 — GA4 measurement ID presence guard (warning-class).
 *
 * Returns an error for every non-template tenant whose `site.ga4MeasurementId`
 * is missing or empty. Currently fires for all live tenants (placeholders).
 * Real G-XXXXXXXXXX IDs are collected in the 05-05 human-verify step.
 *
 * This is intentionally a WARNING guard — an empty ID degrades analytics but
 * does not break the site. It becomes a hard build-fail when wired in 05-05.
 */
export function checkGA4IdPresent(): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = [];
  for (const [id, cfg] of Object.entries(TENANT_REGISTRY)) {
    if (EXCLUDED_TENANTS.has(id)) continue;
    const ga4Id = (cfg.site as { ga4MeasurementId?: string }).ga4MeasurementId ?? "";
    if (!ga4Id.trim()) {
      errors.push(
        err(
          id,
          "MEAS-01",
          `site.ga4MeasurementId is empty — no GA4 analytics for this tenant (collect real G-XXXXXXXXXX in 05-05)`,
        ),
      );
    }
  }
  return errors;
}

/**
 * NAP-01 — site.contact / location NAP parity guard.
 *
 * Asserts that the on-site NAP is consistent between the TenantSite and the
 * physical Location objects (both resolved from the same source in practice, but
 * a copy-paste divergence would be a silent correctness bug).
 *
 * Checks per non-template tenant:
 *   - site.contact.phone === location.phone
 *   - site.contact.address.street === location.address.street
 *   - site.contact.address.city === location.address.city
 *   - site.contact.address.postalCode === location.address.postalCode
 *   - site.hours.length === location.hoursSpec.length
 *
 * Returns [] for all current live tenants (all fields match).
 */
export function checkNapConsistency(): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = [];
  for (const [id, cfg] of Object.entries(TENANT_REGISTRY)) {
    if (EXCLUDED_TENANTS.has(id)) continue;
    const sc = cfg.site.contact;
    const lc = cfg.location;

    if (sc.phone !== lc.phone) {
      errors.push(err(id, "NAP-01", `site.contact.phone "${sc.phone}" !== location.phone "${lc.phone}"`));
    }
    if (sc.address.street !== lc.address.street) {
      errors.push(err(id, "NAP-01", `site.contact.address.street "${sc.address.street}" !== location.address.street "${lc.address.street}"`));
    }
    if (sc.address.city !== lc.address.city) {
      errors.push(err(id, "NAP-01", `site.contact.address.city "${sc.address.city}" !== location.address.city "${lc.address.city}"`));
    }
    if (sc.address.postalCode !== lc.address.postalCode) {
      errors.push(err(id, "NAP-01", `site.contact.address.postalCode "${sc.address.postalCode}" !== location.address.postalCode "${lc.address.postalCode}"`));
    }
    const siteHoursLen = cfg.site.hours.length;
    if (siteHoursLen !== lc.hoursSpec.length) {
      errors.push(err(id, "NAP-01", `site.hours has ${siteHoursLen} blocks but location.hoursSpec has ${lc.hoursSpec.length} — hours-schedule parity mismatch`));
    }
  }
  return errors;
}

export function validateSchemaInvariants(): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = [];

  // I-02 uniqueness check is cross-tenant — run once before the per-tenant loop.
  errors.push(...checkIdUniqueness());

  // F-01 FAQ completeness is per-locale (global dictionaries), not per-tenant.
  errors.push(...checkFaqCompleteness());

  // D-05 / D-11 — Phase 3 content-depth gates, now LIVE (build-blocking).
  errors.push(...checkFaqFloor());
  errors.push(...checkAnswerBlockPresence());

  // P4 04-03/04-04 — nearMe + comparison word-count + cross-tenant overlap gates, now LIVE.
  // checkWordCount() covers both nearMe.answerBlock (≥150) and comparison.body (≥200).
  // checkNearMeWordCount() is superseded by checkWordCount() for the nearMe scope.
  errors.push(...checkWordCount());
  errors.push(...checkCrossTenantOverlap());
  // P4 04-04 — comparison answerBlock presence (≥2 sentences per comparison route).
  errors.push(...checkComparisonAnswerBlockPresence());
  // P4 04-05 — route presence: borough near-me slug in site.routes per tenant.
  errors.push(...checkRoutePresence());

  // P5 05-05 — llms.txt depth (≥200 words) + cross-tenant leak + NAP parity gates,
  // now LIVE (build-blocking). checkGA4IdPresent is intentionally NOT pushed here —
  // it is a warning, emitted by assertSchemaInvariants() (a tenant in transition may
  // legitimately have no GA4 property yet; RESEARCH Q3).
  errors.push(...checkLlmsDepth());
  errors.push(...checkLlmsLeak());
  errors.push(...checkNapConsistency());

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

  // MEAS-01 — GA4 measurement-ID presence is a WARNING, not a build-blocker
  // (05-05 / RESEARCH Q3): a tenant in transition may legitimately ship with no
  // GA4 property yet. Emit advisories here (assert is already impure) without
  // pushing into the throwing error set.
  for (const w of checkGA4IdPresent()) {
    console.warn(`⚠ [${w.invariant}] ${w.tenantId}: ${w.message}`);
  }

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
