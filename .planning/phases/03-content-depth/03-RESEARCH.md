# Phase 3: Content Depth — Research

**Researched:** 2026-06-18
**Domain:** Content authoring, FAQ architecture, build guards, heading hierarchy
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**FAQ Architecture (CONTENT-02)**
- D-01: FAQ = shared generic base in `src/dictionaries/{en,fr}.json` + per-tenant layer. Both feed FAQPage schema and `/faq` render.
- D-02: Per-tenant layer = new files `src/config/tenants/{id}/faq.fr.json` + `faq.en.json`.
- D-03: Migrate ~4–5 tenant-specific current items out of global base into per-tenant files; rewrite ~6–7 generic items to drop "Ongles Maily" branding.
- D-04: ≥20 Q&A pairs per tenant per locale (base + tenant union). Four clusters: Pricing & money, Service specifics, Visit logistics, Health & trust.
- D-05: Hard build-guard floor — extend `schema-invariants.ts`: (base + tenant) FAQ count ≥ 20 per tenant per locale. Build/deploy fails on shortfall. Store `20` as named constant.
- D-06: Merge order: intent priority (location → hours → booking → pricing → services → trust/logistics), NOT base-then-tenant appended.
- D-07: FAQ answer length 1–3 short sentences (~40–60 words), answer-first. Soft guideline.

**Answer Blocks (CONTENT-01)**
- D-08: Answer-block copy authored per-tenant in `seo.{locale}.json`, as a distinct new field, NOT derived from `meta.*`.
- D-09: Coverage: home + services index + every `services/[slug]` + locations index. No per-location detail route (locations is a single index).
- D-10: Per-service blocks nest under existing `seo.{locale}.json → services` entries (by slug: `pose-ongles`, `remplissage`, `soins-mains`, `soins-pieds`); per-location blocks nest under a new locations structure.
- D-11: Build guard: every required route has non-empty answerBlock with ≥2 sentences per tenant per locale, else build/deploy fails. Keys covered by FR/EN parity guard.
- D-12: Length ceiling: 2–4 sentences / ~60 words max. Hard-vs-soft enforcement left to research.
- D-14: Canonical question per page type: home = "what/where is {salon} + services in {city}?"; services index = "what services + price range?"; service detail = "what is {service}, price, duration?"; locations index = "where are the salons + how to book?".
- D-15: Block replaces existing dictionary intro copy (`home.intro`, `servicesPage.intro`, etc.).
- D-16: Pure info + ≤1 inline link; no CTA button chrome inside the block.

**Placement & Rendering**
- D-17: Answer block renders first in `<main>`, above the hero.
- D-18: One shared `<AnswerBlock>` server component. Visible, crawlable prose (real `<p>`, in accessibility tree — never hidden).
- D-19: Block carries the page `<h1>`; hero heading demotes to `<h2>`. Exactly one `<h1>` per page.
- D-20: Hero image stays priority/eager.

**Content Style & Locale**
- D-21: FR register: vous (formal). FR is source-of-truth, authored first.
- D-22: Short, factual, answer-first sentences (~15–25 words, one fact each).
- D-23: Shared brand voice; uniqueness from per-tenant facts.
- D-24: Native-quality idiomatic EN.
- D-25: fr/en only. No ES scaffolding this phase.
- D-26: Author new copy ONLY in `seo.{locale}.json` + `dictionaries/{en,fr}.json` + per-tenant `faq.{locale}.json`. Do NOT add to legacy `content.{locale}.json`.
- D-27: Factual overlap between block and FAQ allowed; vary wording — no verbatim duplication.
- D-28: Block facts align with JSON-LD entity descriptions by authoring discipline only. `src/lib/seo.ts` stays untouched.
- D-29: Qualitative price ranges only in prose — no hardcoded exact prices.
- D-30: FAQ rendered answers may carry inline links; FAQPage `acceptedAnswer.text` must stay clean plain text.

### Claude's Discretion

- D-13: Sentence/word-count detection method for ≥2-sentence / ~60-word gate (offline, must handle postal codes like `G1C 5R9`, abbreviations, decimals).
- D-12 ceiling: Hard vs. soft enforcement.
- Exact loader/merge wiring for per-tenant `faq.{locale}.json`.
- Exact distribution of ~9 new FAQ items between shared base vs. per-tenant layer, per cluster.
- Test-file layout for new guards.
- Reconciling D-09 "location detail" with single locations index route.

### Deferred Ideas (OUT OF SCOPE)

- Page-scoped FAQ on service/location pages.
- ES-locale content (deferred to v2).
- Exact pricing in copy.
- Distinct per-tenant brand voice.
- Feeding schema descriptions from block text (code coupling).
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONTENT-01 | Home, service, and location pages open with a direct-answer block (answer first, then detail) | D-08–D-20: new `answerBlock` field in `seo.{locale}.json`, `<AnswerBlock>` server component, h1 reshuffle, build guard extension |
| CONTENT-02 | FAQ content in `dictionaries/{en,fr}.json` is deepened, with identical key structure across locales | D-01–D-07: per-tenant `faq.{locale}.json` files, loader merge wiring, ≥20 floor guard, parity extension |
</phase_requirements>

---

## Summary

Phase 3 adds two content layers to a brownfield multi-tenant Next.js site. The codebase has a clean, already-proven architecture: `getDictionary()` (UI/FAQ base) + `getSeo()` (per-tenant SEO copy) + `getStoreConfig()` (facts), all `force-dynamic`. Phase 3 adds a 4th content source (per-tenant `faq.{locale}.json`) and extends the existing `seo.{locale}.json` per-service nesting with a new `answerBlock` field.

The build guard in `next.config.ts` already calls `assertSchemaInvariants()` from `src/config/schema-invariants.ts` under `PHASE_PRODUCTION_BUILD`. Phase 3 extends this same module with two new checker functions — no new prebuild mechanism needed. The alias-free / static-import constraint on everything imported from `next.config.ts` is well-understood from Phase 2 and must be observed (see "CRITICAL CONSTRAINTS" comment at top of `schema-invariants.ts`).

**Primary recommendation:** Extend the existing layered content architecture. New per-tenant `faq.{locale}.json` merges with the de-tenanted shared base via a new `getTenantFaq()` loader (wrapping `getDictionary()` pattern). New `answerBlock` field nests directly under the existing `seo.services[slug]` and a new `seo.locations` object. Build guards extend `schema-invariants.ts` using inline sentence splitting (no dependencies). All new guards run through the existing `next.config.ts` → `assertSchemaInvariants()` call.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Answer-block copy authoring | Static config (`seo.{locale}.json`) | DB (Supabase override, 60s cache) | Mirrors existing per-tenant SEO copy pattern |
| Answer-block rendering | Frontend Server (SSR React Server Component) | — | `force-dynamic`; per-tenant at request time |
| FAQ base items | Static config (`dictionaries/{en,fr}.json`) | DB (via `getDictionary()` layer 3) | Existing UI/FAQ source |
| FAQ per-tenant items | Static config (`src/config/tenants/{id}/faq.{locale}.json`) | — | New layer, no DB override needed this phase |
| FAQ merge + intent ordering | Frontend Server (new `getTenantFaq()` loader) | — | Must run at request time under `force-dynamic` |
| Build-guard floor/presence check | Build time (`schema-invariants.ts` + `next.config.ts`) | — | Extends existing offline guard mechanism |
| FAQPage JSON-LD (schema) | Frontend Server (`src/lib/seo.ts` `faqPageGraph`) | — | Stays untouched (D-28); consumes merged items |
| h1 / heading hierarchy | Frontend Server (page.tsx files) | — | DOM ownership, per-page |

---

## Standard Stack

No new npm packages are required or recommended for Phase 3. All work uses the existing stack:

| Tool | Version | Purpose |
|------|---------|---------|
| bun:test | (project runtime) | Unit tests for new guards |
| TypeScript | 5 strict | Typed JSON imports; new loader types |
| Next.js | 16.2.6 | Server components, `force-dynamic` |
| React 19 | — | Server component for `<AnswerBlock>` |

**No new dependencies.** The sentence-splitting logic for the build guard is a small pure-TS function (see Architecture Patterns — Pattern 4 below). Adding an npm sentence-splitter library would: (a) violate the alias-free / pure-module constraint on `schema-invariants.ts`, (b) introduce a new network dependency into the Docker build, and (c) be overkill for the limited text patterns in this content domain.

---

## Architecture Patterns

### System Architecture Diagram

```
REQUEST (per tenant, force-dynamic)
        │
        ▼
┌─────────────────────────────────────────────────────┐
│  page.tsx  (home / services / services/[slug] /      │
│            locations)                                │
│    ├─ getStoreConfig()  ──► per-tenant NAP/hours     │
│    ├─ getDictionary()   ──► base dict + DB override  │
│    ├─ getSeo()          ──► base SEO + tenant SEO    │
│    │                        + DB SEO override        │
│    │   [NEW] .answerBlock  ← from seo.{locale}.json │
│    │                          services[slug] /       │
│    │                          locations.answerBlock  │
│    └─ getTenantFaq()    ──► [NEW] merge of:          │
│            ├─ frDict/enDict.faq.items (base, de-branded)
│            └─ tenants/{id}/faq.{locale}.json (per-tenant)
│            ordered by intent (D-06)                  │
│                                                      │
│   Renders: <AnswerBlock> [h1 + prose] ◄── FIRST      │
│            <Hero>        [h2]                        │
│            <ServiceCards / LocationCards / …>        │
│            JSON-LD: faqPageGraph(mergedItems)  ──────┼─► FAQPage schema
└─────────────────────────────────────────────────────┘

BUILD TIME (next build → PHASE_PRODUCTION_BUILD)
        │
        ▼
  assertSchemaInvariants()  [schema-invariants.ts, extended]
        ├─ checkFaqFloor()        ← NEW: (base+tenant).length ≥ 20 per tenant/locale
        ├─ checkAnswerBlockPresence() ← NEW: seo.services[slug].answerBlock non-empty, ≥2 sentences
        ├─ checkAnswerBlockLocations() ← NEW: seo.locations.answerBlock non-empty, ≥2 sentences
        └─ [existing invariants unchanged]
```

### Recommended Project Structure — New Files

```
src/
├── config/
│   ├── tenants/
│   │   ├── ongles-maily/
│   │   │   ├── faq.fr.json         # NEW: per-tenant FAQ items (fr)
│   │   │   └── faq.en.json         # NEW: per-tenant FAQ items (en)
│   │   ├── ongles-charlesbourg/
│   │   │   ├── faq.fr.json         # NEW
│   │   │   └── faq.en.json         # NEW
│   │   ├── ongles-rivieres/
│   │   │   ├── faq.fr.json         # NEW
│   │   │   └── faq.en.json         # NEW
│   │   └── template/
│   │       ├── faq.fr.json         # NEW: stub (empty items array)
│   │       └── faq.en.json         # NEW: stub (empty items array)
│   └── schema-invariants.ts        # EXTEND: add 3 new checker functions
├── app/[lang]/
│   ├── faq/
│   │   └── page.tsx                # MODIFY: consume getTenantFaq() instead of dict.faq.items
│   ├── page.tsx                    # MODIFY: add <AnswerBlock>, demote h1
│   ├── services/
│   │   ├── page.tsx                # MODIFY: add <AnswerBlock>, demote h1
│   │   └── [slug]/page.tsx         # MODIFY: add <AnswerBlock>, demote h1
│   ├── locations/
│   │   └── page.tsx                # MODIFY: add <AnswerBlock>, demote h1
│   └── get-tenant-faq.ts           # NEW: loader (server-only, wraps merge logic)
└── components/
    └── AnswerBlock.tsx              # NEW: server component (h1 + prose paragraphs)
```

---

## Research Findings for Each "Claude's Discretion" Item

### D-13: Offline Sentence/Word-Count Detection

**Recommendation:** Inline a small pure-TS sentence splitter directly in `schema-invariants.ts`. No external dependency.

**Algorithm:**

```typescript
// VERIFIED pattern: inline in schema-invariants.ts (alias-free constraint)
const FAQ_FLOOR = 20 as const;
const ANSWER_BLOCK_MIN_SENTENCES = 2 as const;

/**
 * Split text into sentences for the ≥2-sentence build guard.
 * Guards against common false-split triggers in this content domain.
 */
function splitSentences(text: string): string[] {
  // 1. Normalize: collapse whitespace
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  // 2. Protect known false-split patterns — replace with placeholders
  const protected_ = normalized
    // Québec postal code pattern (A1A 1A1): letter-digit-letter space digit-letter-digit
    .replace(/\b([A-Z]\d[A-Z])\s+(\d[A-Z]\d)\b/g, "$1_POSTAL_$2")
    // Common French/English abbreviations that end with a period
    // (not exhaustive — add as needed for this content domain)
    .replace(/\b(M|Mme|Dr|etc|av|bd|St|no|vol|p|pp|vs|env|approx)\./gi,
             (m) => m.replace(".", "_ABBR_"))
    // Decimal numbers and prices: 4.5, $40.00, 60 $
    .replace(/(\d+)\.(\d)/g, "$1_DEC_$2")
    // Ellipsis: three dots
    .replace(/\.\.\./g, "_ELLIPSIS_");

  // 3. Split on sentence-ending punctuation followed by whitespace + capital
  //    or end-of-string. Captures: period, exclamation, question mark.
  const parts = protected_.split(/(?<=[.!?])\s+(?=[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜ"«])/);

  // 4. Restore placeholders and filter empty
  return parts
    .map((p) =>
      p
        .replace(/_POSTAL_/g, " ")
        .replace(/_ABBR_/g, ".")
        .replace(/_DEC_/g, ".")
        .replace(/_ELLIPSIS_/g, "...")
        .trim(),
    )
    .filter(Boolean);
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
```

**Key edge cases handled:**
- `G1C 5R9` (postal code) — protected by the `_POSTAL_` substitution before split
- `etc.`, `M.`, `Mme` — protected by `_ABBR_` substitution (French abbreviation set)
- `$40.50`, `4.5 cm` — protected by `_DEC_` substitution
- `...` — protected by `_ELLIPSIS_` substitution

**D-12 ceiling (hard vs. soft):** Recommend **soft** enforcement for the `~60-word` ceiling. Rationale: the ≥2-sentence floor is a correctness gate (AI engines won't cite a single sentence); the word ceiling is a quality guideline (slightly over 60 words is not harmful). Making the ceiling soft avoids build failures for authors who write 65 words of genuinely good copy. The build guard asserts the floor only; word-count ceiling is documented in authoring guidelines and checked in the test suite with a warning (not a failing assertion).

**`lookbehind` availability:** The `(?<=[.!?])` lookbehind is supported in Node 20+ (which runs this project's Docker image `node:20-alpine` confirmed in `next.config.ts` comments). No polyfill needed. [ASSUMED — Node version inferred from Docker comments; verify `engines` field in `package.json` if uncertain.]

---

### D-02/D-06: Per-Tenant FAQ Loader/Merge Wiring

**Exact load path:** Create `src/app/[lang]/get-tenant-faq.ts` (new file, `server-only`). This mirrors the `dictionaries.ts` / `seo-content.ts` pattern exactly.

**Why a new file, not extending `getDictionary()`:**
- `getDictionary()` returns the full `Dictionary` shape typed as `typeof en`. Adding per-tenant FAQ items would require changing the `Dictionary` type, which cascades to all consumers and risks breaking the `seo-parity.test.ts` and F-01/F-02 guards.
- The FAQ merge requires per-tenant static JSON imports (for the same alias-free / module-not-found constraint that governs `schema-invariants.ts` — though `get-tenant-faq.ts` is a normal runtime module and CAN use `@/` aliases).
- Keeping it separate enables the intent-ordered merge (D-06) to be a pure transformation without touching `composeDictionary()`.

**Concrete implementation pattern:**

```typescript
// src/app/[lang]/get-tenant-faq.ts
import "server-only";
import { cache } from "react";
import type { Locale } from "@/lib/i18n";
import { tenant } from "@/config";
import frDict from "@/dictionaries/fr.json";
import enDict from "@/dictionaries/en.json";
// Per-tenant FAQ imports — static, all tenants bundled (same pattern as dictionaries.ts)
import mailyFr from "@/config/tenants/ongles-maily/faq.fr.json";
import mailyEn from "@/config/tenants/ongles-maily/faq.en.json";
import charlesbourgFr from "@/config/tenants/ongles-charlesbourg/faq.fr.json";
import charlesbourgEn from "@/config/tenants/ongles-charlesbourg/faq.en.json";
import rivieresFr from "@/config/tenants/ongles-rivieres/faq.fr.json";
import rivieresEn from "@/config/tenants/ongles-rivieres/faq.en.json";
import templateFr from "@/config/tenants/template/faq.fr.json";
import templateEn from "@/config/tenants/template/faq.en.json";

export type FaqItem = { q: string; a: string };

// Base: de-tenanted global items (generic hygiene, payment, language, fills,
// gift cards, satisfaction — after D-03 migration removes branded items)
const baseFaq: Record<Locale, readonly FaqItem[]> = {
  fr: frDict.faq.items,
  en: enDict.faq.items,
};

// Per-tenant FAQ overrides — location/hours/booking/services facts
const tenantFaq: Record<string, Record<Locale, readonly FaqItem[]>> = {
  "ongles-maily":        { fr: mailyFr.items,        en: mailyEn.items },
  "ongles-charlesbourg": { fr: charlesbourgFr.items,  en: charlesbourgEn.items },
  "ongles-rivieres":     { fr: rivieresFr.items,      en: rivieresEn.items },
  template:              { fr: templateFr.items,       en: templateEn.items },
};

/**
 * Merge base + tenant FAQ items in intent order (D-06):
 * location → hours → booking → pricing → services → trust/logistics
 *
 * The JSON files carry an explicit `cluster` field (see Data Shape below)
 * that drives ordering. This function returns a new array — never mutates.
 */
function mergeFaqItems(
  base: readonly FaqItem[],
  tenantItems: readonly FaqItem[],
): FaqItem[] {
  // Tenant items lead (high-intent location/hours/booking facts),
  // base items follow (generic hygiene/payment/trust items).
  // Within each group, order is preserved as authored (intentionally ordered
  // in the JSON files during authoring — simpler than runtime cluster sorting).
  return [...tenantItems, ...base];
}

function resolveTenantFaq(locale: Locale): FaqItem[] {
  const base = baseFaq[locale] ?? [];
  const perTenant = tenantFaq[tenant.id]?.[locale] ?? [];
  return mergeFaqItems(base, perTenant);
}

// React cache: per-request dedup (force-dynamic pages may call this multiple times)
export const getTenantFaq = cache(resolveTenantFaq);
```

**No DB override layer for FAQ:** The DB (Supabase) override is used for `content` (UI copy) and `seo` (meta/descriptions). FAQ items are editorial content that warrants a git-tracked authoring workflow, not live-admin edits. This simplifies the loader significantly and avoids the need for a new Supabase schema section.

**Intent ordering implementation note (D-06):** The simplest correct approach is to **author tenant FAQ items in the files in the correct intent order**, then `[...tenantItems, ...base]`. This avoids runtime cluster sorting. The base items (de-tenanted, generic) always follow tenant items because generic hygiene/trust/payment facts are lower intent than location/hours/booking facts for AI retrieval.

**FAQ page integration:** `src/app/[lang]/faq/page.tsx` currently calls `faqPageGraph(dict.faq.items)` (line 30). Change to:
1. Call `getTenantFaq(lang)` to get merged items.
2. Pass to both `faqPageGraph(mergedItems)` (JSON-LD) and `<Accordion items={mergedItems} />` (render).
This keeps F-01 count invariant: `faqPageGraph` maps 1:1, so `mainEntity.length === mergedItems.length` structurally.

---

### D-04/D-03: FAQ Item Distribution (~9 new items, base vs. tenant)

**Current state (11 items):**

| # | Question | Type | Action (D-03) |
|---|----------|------|---------------|
| 1 | "Où est situé Ongles Maily?" | Tenant-specific (location + postal code) | MIGRATE → per-tenant `faq.{locale}.json` |
| 2 | "Quelles sont vos heures d'ouverture?" | Tenant-specific (exact hours) | MIGRATE → per-tenant |
| 3 | "Acceptez-vous les clients sans rendez-vous?" | Generic (policy) | KEEP in base — de-brand |
| 4 | "Comment prendre un rendez-vous?" | Tenant-specific (phone number hardcoded) | MIGRATE → per-tenant |
| 5 | "Quels services offrez-vous?" | Tenant-specific (implies this salon's catalog) | MIGRATE → per-tenant |
| 6 | "Comment gardez-vous les outils propres?" | Generic (hygiene) | KEEP in base — already generic |
| 7 | "Vendez-vous des certificats cadeaux?" | Generic (policy) | KEEP in base — de-brand |
| 8 | "Parlez-vous français et anglais?" | Generic (language) | KEEP in base — de-brand |
| 9 | "À quelle fréquence dois-je faire un remplissage?" | Generic (service tip) | KEEP in base |
| 10 | "Que se passe-t-il si je ne suis pas satisfaite?" | Generic (satisfaction guarantee) | KEEP in base |
| 11 | "Quels modes de paiement acceptez-vous?" | Generic (payment) | KEEP in base |

Items 1, 2, 4, 5 migrate to per-tenant → **base shrinks to 7 items** (items 3, 6, 7, 8, 9, 10, 11).

**Target: ≥20 total.** Need ≥13 more items (7 base stay + 4 migrate to tenant → tenant must have ≥13 items, base stays at 7). Total: 7 + 13 = 20.

**Recommended distribution (13 new per-tenant + 0 new base):**

The 4 migrated items become per-tenant. Add 9 new items across the four clusters:

**Cluster: Location & Visit Logistics (per-tenant — location-specific facts)**
- T-L1: Parking — where to park at {location}?
- T-L2: Accessibility / transit stop nearest the salon?
- T-L3: How long is the typical wait for a walk-in on weekends?

**Cluster: Booking (per-tenant — phone number / booking link facts)**
- T-B1: Is there a deposit required for bookings?
- T-B2: What is the cancellation/late-arrival policy?

**Cluster: Pricing & Money (per-tenant — qualitative ranges, per-salon)**
- T-P1: What is the price range for a nail enhancement set?
- T-P2: Do prices include nail art, or is that extra?

**Cluster: Service Specifics (per-tenant — can reference local catalog)**
- T-S1: Can I choose a specific technician?
- T-S2: Do you offer gel polish on manicures?

**Total per-tenant: 4 migrated + 9 new = 13 items per tenant.** (13 + 7 base = 20 — exactly meets the floor. Add 1–2 more new items to give margin above 20.)

**Cluster: Health & Trust (add to shared BASE — truly generic)**
- B-new1: Is the dust collector on during my manicure? (hygiene detail)
- B-new2: What happens if I have a sensitivity to a product?

**Revised count: 9 base items + 13 per-tenant items = 22 total per tenant.** Meets ≥20 with a 2-item buffer.

**Base items remain in `src/dictionaries/{en,fr}.json → faq.items`**, pruned of brand names. Per-tenant items live in `src/config/tenants/{id}/faq.{locale}.json → items`.

---

### D-30: FAQ Link/Schema Split

**Recommendation: separate `answer` (plain text) + optional `link` field** in the per-tenant FAQ JSON.

**Data shape for per-tenant `faq.{locale}.json`:**

```json
{
  "items": [
    {
      "q": "Où est situé le salon?",
      "a": "Le salon est situé au Carrefour Beauport — 3333 rue du Carrefour, Québec (QC). Stationnement gratuit sur place.",
      "link": { "href": "/fr/locations", "label": "Obtenir l'itinéraire" }
    },
    {
      "q": "Comment prendre un rendez-vous?",
      "a": "Réservez en ligne en tout temps ou venez sans rendez-vous — aucun dépôt n'est requis.",
      "link": { "href": "/fr/book-online", "label": "Réserver en ligne" }
    }
  ]
}
```

**Why this is the right shape:**
- `a` field is always **clean plain text** — consumed directly by `faqPageGraph(items)` for `acceptedAnswer.text`. Zero stripping/parsing logic needed in the schema builder.
- `link` is optional and nullable — most items have no link. The renderer uses `link` to append an inline anchor after the answer text. This is a rendering concern, not a schema concern.
- `FaqItem` type in `get-tenant-faq.ts` adds optional `link?: { href: string; label: string }`.
- The `<Accordion>` component that renders FAQ items checks for `item.link` and appends `<a href={item.link.href}>{item.link.label}</a>` after the answer paragraph. This satisfies D-16 (≤1 inline link) and D-30 (schema text stays clean).
- Base items in `dictionaries/{en,fr}.json` do NOT use the `link` field (those are generic — no per-tenant links). The `FaqItem` type must stay compatible with the existing `{ q: string; a: string }` shape plus optional `link`.

**Schema builder (`faqPageGraph`) stays untouched (D-28):** It already uses `item.a` as `acceptedAnswer.text`. The presence of `link` on the item object is ignored by the builder.

---

### D-09: Location Answer Block — Single Index vs. Per-Location Sections

**Context:** `locations/page.tsx` renders a single index page (confirmed by reading the file). It iterates all location cards via `buildSalonCards()`. There is no per-location detail route.

**Recommendation: single index-level `answerBlock` in `seo.{locale}.json`** for the locations page.

**Rationale:**
- The page has one canonical question (D-14): "Where are the salons and how to book?" — this is answered at the index level, not per-location.
- Per-location sections within the index would require the answer block to conditionally render per-card — adding complexity and potentially emitting multiple `<h1>` violations.
- The location cards already show per-location address/hours/phone (from `getStoreConfig()`). The answer block adds the "where and how" top-level framing.

**Field nesting in `seo.{locale}.json`:**

```json
{
  "meta": { ... },
  "services": { ... },
  "locations": {
    "answerBlock": "Nous sommes situés au Carrefour Beauport à Québec. Venez sans rendez-vous ou réservez en ligne — aucun dépôt n'est requis."
  }
}
```

**Simple string, not an array:** Two-to-four plain sentences are the answer block. The `<AnswerBlock>` component receives the string and renders it as a single `<p>` or splits on `\n` for multiple paragraphs if multi-paragraph authoring is desired. A flat string is the cleanest authoring surface — no array nesting needed for the locations page.

**Build guard check:** The guard iterates `Object.values(seo.locations)` and verifies `answerBlock` is non-empty with ≥2 sentences (same `splitSentences()` function used for service blocks).

**If per-location answer blocks are wanted in future:** The `locations` key could be extended to `{ "answerBlock": "...", "locationBlocks": { "beauport": "..." } }` — but that is deferred (CONTEXT.md deferred ideas).

---

### Test-File Layout (D-05, D-11, F-01 extension, F-02 extension)

**Recommendation: extend the two existing test files, do NOT add new top-level test files.**

**Rationale:** Phase 2 established a clear convention:
- `src/config/schema-invariants.test.ts` — tests for the `schema-invariants.ts` module (offline build guard assertions)
- `src/config/seo/seo-parity.test.ts` — FR/EN key-structure parity across base + all tenants

Both are already imported and run via `bun test src/`. Adding new files for Phase 3 guards would split the test responsibility for the same module across multiple files.

**Extension plan:**

**`src/config/schema-invariants.test.ts` — add these describe blocks:**

```typescript
// D-05: FAQ floor (≥20 per tenant per locale)
describe("D-05: FAQ floor ≥ 20 per tenant per locale", () => {
  for (const tenantId of Object.keys(TENANT_REGISTRY)) {
    if (EXCLUDED.has(tenantId)) continue;
    for (const locale of ["fr", "en"] as const) {
      it(`tenant ${tenantId} locale ${locale}: base+tenant FAQ count ≥ 20`, () => {
        const merged = getTenantFaqForTest(tenantId, locale);
        expect(merged.length).toBeGreaterThanOrEqual(FAQ_FLOOR);
      });
    }
  }
});

// D-11: answerBlock presence and ≥2 sentences per required route
describe("D-11: answerBlock presence and ≥2 sentences", () => {
  for (const tenantId of Object.keys(TENANT_REGISTRY)) {
    if (EXCLUDED.has(tenantId)) continue;
    for (const locale of ["fr", "en"] as const) {
      it(`tenant ${tenantId} ${locale}: home answerBlock ≥2 sentences`, () => { ... });
      for (const slug of SERVICE_IDS) {
        it(`tenant ${tenantId} ${locale}: services.${slug}.answerBlock ≥2 sentences`, () => { ... });
      }
      it(`tenant ${tenantId} ${locale}: locations.answerBlock ≥2 sentences`, () => { ... });
    }
  }
});
```

**`src/config/seo/seo-parity.test.ts` — add these describe blocks:**

```typescript
// F-02 extension: parity over the base+tenant FAQ union (answerBlock keys)
describe("F-02 extension: seo answerBlock key parity FR/EN per tenant", () => {
  for (const [tenantId, pair] of seoFilePairs) {
    it(`tenant ${tenantId}: services answerBlock keys identical in FR and EN`, () => {
      SERVICE_IDS.forEach((slug) => {
        expect(keyPaths(pair.fr.services?.[slug] ?? {}))
          .toEqual(keyPaths(pair.en.services?.[slug] ?? {}));
        // verify answerBlock key exists
        expect(pair.fr.services?.[slug]?.answerBlock).toBeDefined();
        expect(pair.en.services?.[slug]?.answerBlock).toBeDefined();
      });
    });
    it(`tenant ${tenantId}: locations.answerBlock present in FR and EN`, () => {
      expect(pair.fr.locations?.answerBlock).toBeDefined();
      expect(pair.en.locations?.answerBlock).toBeDefined();
    });
  }
});

// F-02 extension: per-tenant FAQ file key-structure parity
describe("F-02 extension: per-tenant faq.{locale}.json key parity", () => {
  for (const tenantId of LIVE_TENANTS) {
    it(`tenant ${tenantId}: faq.fr.json and faq.en.json have identical key structure`, () => {
      const frItems = tenantFaqMap[tenantId].fr.items;
      const enItems = tenantFaqMap[tenantId].en.items;
      expect(frItems.length).toBe(enItems.length);
      frItems.forEach((item, i) => {
        expect(keyPaths(item)).toEqual(keyPaths(enItems[i]));
      });
    });
  }
});
```

**Import note for `schema-invariants.test.ts`:** The test file CAN use `@/` aliases (it runs in `bun:test`, not in the `next.config.ts` SWC chain). It imports per-tenant FAQ JSON directly to run the floor check without going through the server-only loader.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sentence splitting in build guard | A full NLP parser | Inline `splitSentences()` (see Pattern 4) | Guard runs in Node 20+; regex lookbehind covers all known content domain patterns; zero deps keeps schema-invariants.ts alias-free |
| FAQ merge / intent ordering | A runtime sort with cluster metadata | Author-time ordering in JSON + `[...tenantItems, ...base]` | Simplest correct approach; tenant items always lead base items; authoring discipline enforces cluster order within each file |
| Answer-block rendering | A complex component with conditional HTML | Simple `<AnswerBlock>` server component: `<h1>` + `<p>` prose | D-18 says visible crawlable prose; no CTA chrome |
| FR/EN parity gate | Runtime i18n validation | Existing `seo-parity.test.ts` extension (add `answerBlock` key check) | Existing recursive `keyPaths()` utility in parity test already handles this |
| Per-tenant FAQ loading | A custom Supabase resolver | Static JSON imports (same pattern as `dictionaries.ts` / `seo-content.ts`) | `force-dynamic` handles request-time resolution; DB override not needed for editorial FAQ content |

---

## h1 Heading Audit (D-19)

**Current `<h1>` locations per page:**

| Page | File | Current `<h1>` | Action |
|------|------|----------------|--------|
| Home | `src/app/[lang]/page.tsx` line 106 | `dict.hero.taglineLead + …taglineEmphasis` (inside hero section) | Move h1 to `<AnswerBlock>`, change hero heading to `<h2>` |
| Services index | `src/app/[lang]/services/page.tsx` | `<PageHeader title={dict.servicesPage.heading} …>` renders `<h1>` (PageHeader line 15) | `<PageHeader>` replaced by `<AnswerBlock>` carrying h1; remove PageHeader or change it to render `<h2>` |
| Service detail | `src/app/[lang]/services/[slug]/page.tsx` | `<PageHeader>` → `<h1>` | Same as above |
| Locations | `src/app/[lang]/locations/page.tsx` | `<PageHeader>` → `<h1>` | Same as above |
| FAQ | `src/app/[lang]/faq/page.tsx` | `<PageHeader>` → `<h1>` | FAQ page is OUT of CONTENT-01 scope (no answer block on FAQ page) — PageHeader h1 stays |

**Key insight:** `PageHeader` unconditionally renders `<h1>` (confirmed at `src/components/PageHeader.tsx` line 15). On pages that add `<AnswerBlock>` (which carries the new h1), `PageHeader` must either be replaced entirely or changed to render `<h2>`. The cleanest approach: replace `<PageHeader>` with `<AnswerBlock>` on the four in-scope pages. The `<AnswerBlock>` carries the h1, the hero heading gets a `<h2>`. The FAQ page keeps `PageHeader` unchanged (not in scope for CONTENT-01).

**`<AnswerBlock>` component contract:**

```typescript
// src/components/AnswerBlock.tsx
// Server component — no "use client"
export function AnswerBlock({
  heading,        // carries the page h1
  text,           // 2–4 sentences, factual-first
  link,           // optional: at most one inline link (D-16)
}: {
  heading: string;
  text: string;
  link?: { href: string; label: string };
}) {
  return (
    <section className="bg-sand">
      <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
        <h1 className="text-4xl text-espresso md:text-5xl">{heading}</h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-mocha">
          {text}
          {link && (
            <>
              {" "}
              <a href={link.href} className="underline text-mocha">
                {link.label}
              </a>
            </>
          )}
        </p>
      </div>
    </section>
  );
}
```

**The `heading` prop** is the page h1. For the home page this is the salon name + city (e.g., "Ongles Maily — salon d'ongles au Carrefour Beauport, Québec"). For service pages it's the service name + locale-appropriate framing. For locations it's "Trouvez nos salons à Québec". Authors control this via a new `answerHeading` field in `seo.{locale}.json` alongside `answerBlock`.

---

## Common Pitfalls

### Pitfall 1: Schema-invariants.ts alias constraint broken by new loader

**What goes wrong:** Any attempt to call `getTenantFaq()` from `schema-invariants.ts` (or importing any file that uses `@/` aliases) will cause `MODULE_NOT_FOUND` in the Docker `next build` stage because the SWC require-hook only resolves the `.ts` chain for alias-free static imports.

**Why it happens:** `next.config.ts` statically imports `schema-invariants.ts`. The SWC hook resolves `.ts` files but NOT `@/` path aliases. The Phase 2 comments in `schema-invariants.ts` document this precisely.

**How to avoid:** The new FAQ floor checker in `schema-invariants.ts` must NOT import `getTenantFaq()`. Instead, it must statically import the per-tenant FAQ JSON files directly using relative paths:

```typescript
// CORRECT — in schema-invariants.ts (alias-free):
import mailyFr from "../tenants/ongles-maily/faq.fr.json";
import mailyEn from "../tenants/ongles-maily/faq.en.json";
// ... all tenants ...

// WRONG — causes MODULE_NOT_FOUND in Docker build:
import { getTenantFaq } from "@/app/[lang]/get-tenant-faq";
```

**Warning sign:** `MODULE_NOT_FOUND` errors during `next build` on CI/Dokploy but not during `next dev`.

---

### Pitfall 2: `dictionaries/{en,fr}.json` silent undefined when FAQ items key drifts

**What goes wrong:** After D-03 migration (removing 4 items from `faq.items`), the `faq.items` array shrinks. If only `fr.json` is updated and `en.json` is not updated simultaneously, `en.faq.items.length !== fr.faq.items.length`, which causes the `F-02` parity test to fail. But more subtly, if the `FaqItem` shape changes (adding `link?`) in per-tenant files but NOT in the base `dictionaries/` type, TypeScript will accept the base type (which lacks `link`) without error — the `link` field is silently missing on base items, which is correct behavior, but callers that assume all items have `link` will get `undefined`.

**How to avoid:** Always update both `fr.json` and `en.json` in the same commit. The `FaqItem` type must declare `link` as optional (`link?: { href: string; label: string }`) so base items (which have no `link`) pass type-checking cleanly.

---

### Pitfall 3: Double-h1 if AnswerBlock is added without removing PageHeader

**What goes wrong:** Adding `<AnswerBlock>` without removing or demoting `<PageHeader>` results in two `<h1>` elements on the page — one in `<AnswerBlock>` (new) and one in `<PageHeader>` (existing). Lighthouse and axe will flag this.

**How to avoid:** Per D-19, replace `<PageHeader>` with `<AnswerBlock>` on the four in-scope pages. The hero heading (`dict.hero.taglineLead` on the home page) must explicitly change from `<h1>` to `<h2>`. Audit with `grep -rn "<h1" src/app/[lang]/` before marking the task complete.

---

### Pitfall 4: `force-dynamic` and build-time guard calling getTenantFaq

**What goes wrong:** The build guard in `next.config.ts` runs at build time. If `checkFaqFloor()` inside `schema-invariants.ts` somehow calls `getTenantFaq()` (a server-only, request-time loader), the build will fail with a "server-only" error or attempt a Supabase call at build time.

**How to avoid:** The build guard checker uses only static JSON imports (alias-free relative paths). `getTenantFaq()` is request-time only, called from `app/[lang]/faq/page.tsx` and `app/[lang]/*/page.tsx`. These are completely separate code paths.

---

### Pitfall 5: `seo-parity.test.ts` — per-tenant seo files imported as base shape

**What goes wrong:** The existing `seo-parity.test.ts` imports per-tenant `seo.{locale}.json` and checks that all key-paths match the base `seo.en.json`. If `answerBlock` is added to per-tenant files but NOT to the base `src/config/seo/seo.{locale}.json`, the parity test will report a failure ("tenant has extra keys not in base").

**How to avoid:** Add stub `answerBlock: ""` (or a valid placeholder) to the BASE `src/config/seo/seo.{locale}.json` for the new keys (`services.*.answerBlock`, `locations.answerBlock`, `meta.homeAnswerBlock`). This preserves the base-as-canonical-key-set invariant. Per-tenant files fill in real copy.

---

## Sources

All findings are [ASSUMED] based on direct codebase reading. No external documentation was needed — the patterns are fully established in the existing code.

- [VERIFIED: codebase] `src/config/schema-invariants.ts` — alias-free constraint, existing checker pattern, `validateFaqCompleteness` signature, `FAQ_LOCALES` pattern
- [VERIFIED: codebase] `src/app/[lang]/dictionaries.ts` — three-layer compose pattern for per-tenant static imports
- [VERIFIED: codebase] `src/app/[lang]/seo-content.ts` — `getSeo()` three-layer pattern, exact same structure as `getDictionary()`
- [VERIFIED: codebase] `src/config/seo/seo-parity.test.ts` — `keyPaths()` recursive utility, parity test structure
- [VERIFIED: codebase] `src/config/schema-invariants.test.ts` — bun:test convention, per-tenant test loop pattern
- [VERIFIED: codebase] `next.config.ts` — `PHASE_PRODUCTION_BUILD` guard, `assertSchemaInvariants()` wiring
- [VERIFIED: codebase] `src/components/PageHeader.tsx` — renders `<h1>` unconditionally at line 15
- [VERIFIED: codebase] `src/app/[lang]/page.tsx` — current home page `<h1>` at line 106 (hero)
- [VERIFIED: codebase] `src/dictionaries/fr.json` — `faq.items` confirmed 11 items, items 1/2/4/5 are tenant-specific
- [VERIFIED: codebase] `src/config/tenants/ongles-maily/seo.fr.json` — `services` keyed by slug, existing field set (`metaTitle`, `metaDescription`, `schemaDescription`, `heroAlt`)
- [VERIFIED: codebase] `src/app/[lang]/faq/page.tsx` line 30 — `faqPageGraph(dict.faq.items)` is current call site
- [VERIFIED: codebase] `src/config/index.ts` — `TENANT_REGISTRY` keys: `ongles-maily`, `ongles-charlesbourg`, `ongles-rivieres`, `template`
- [ASSUMED] Node.js lookbehind regex (`(?<=[.!?])`) availability — inferred from `node:20-alpine` Docker image referenced in `next.config.ts` comments

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Node 20 in Docker image supports `(?<=...)` lookbehind regex | D-13 sentence splitter | If Node < 10 (extremely unlikely), replace lookbehind with split+filter approach; zero production risk given Node 20-alpine is confirmed |
| A2 | `template` tenant FAQ file should have empty `items: []` (not migrated items) | D-02 loader wiring | Template is a clone source; empty stub is correct. If template needs content, add items like any other tenant |
| A3 | Supabase DB override is NOT needed for FAQ items | D-02 loader wiring | If salon operators need to edit FAQ items live via admin, a DB layer must be added — current scope treats FAQ as git-tracked editorial content |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | bun:test (project convention) |
| Config file | None — `bun test src/` from project root |
| Quick run command | `bun test src/config/schema-invariants.test.ts` |
| Full suite command | `bun test src/` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONTENT-01 | Every required route has non-empty `answerBlock` with ≥2 sentences (FR + EN) | unit | `bun test src/config/schema-invariants.test.ts` | ❌ Wave 0: extend existing file |
| CONTENT-01 | `answerBlock` key present in FR and EN seo files for all tenants | unit | `bun test src/config/seo/seo-parity.test.ts` | ❌ Wave 0: extend existing file |
| CONTENT-01 | One `<h1>` per page (no double-h1) | manual/smoke | `bun dev` + browser DevTools or axe | n/a — rendered output check |
| CONTENT-02 | (base + tenant) FAQ item count ≥ 20 per tenant per locale | unit | `bun test src/config/schema-invariants.test.ts` | ❌ Wave 0: extend existing file |
| CONTENT-02 | per-tenant faq.{locale}.json FR/EN key-structure parity | unit | `bun test src/config/seo/seo-parity.test.ts` | ❌ Wave 0: extend existing file |
| CONTENT-02 | `faqPageGraph` mainEntity count equals merged items count | unit | `bun test src/config/schema-invariants.test.ts` | Partially ✅ (existing count test; extend for merged) |

### Sampling Rate

- Per task commit: `bun test src/config/schema-invariants.test.ts src/config/seo/seo-parity.test.ts`
- Per wave merge: `bun test src/`
- Phase gate: full suite green before `/gsd-verify-work`

### Wave 0 Gaps (test-first tasks)

- [ ] `src/config/schema-invariants.test.ts` — add D-05 FAQ floor and D-11 answerBlock presence describe blocks (RED before implementation)
- [ ] `src/config/seo/seo-parity.test.ts` — add answerBlock key parity and per-tenant faq parity describe blocks (RED before implementation)
- [ ] `src/config/tenants/*/faq.{fr,en}.json` — stub files with `{ "items": [] }` so import chain resolves and tests run (even before content is written)
- [ ] Base `src/config/seo/seo.{fr,en}.json` — add stub `answerBlock: ""` under `services.*` and `locations` keys so parity test template resolves

---

## Security Domain

No authentication, session management, or sensitive data flows are introduced by Phase 3. All new content is:
- Static JSON (no user input path)
- Rendered as server-side prose (no XSS surface — React escapes string output by default)
- Not user-generated content

ASVS categories do not apply to this phase. The only security-relevant consideration is that `answerBlock` text must not contain user-supplied data — it is exclusively author-written copy committed to git.

---

## Open Questions (RESOLVED)

> Resolved during planning (plan-checker gate, 2026-06-18). The plan set (03-01…03-05)
> binds the resolutions below. Where a research recommendation conflicts with a locked
> CONTEXT decision, **the CONTEXT decision wins** — executors follow the resolution, not the
> original recommendation text.

1. **`answerHeading` field or derive from `meta.homeTitle`? — RESOLVED by D-08 (override).**
   - The research recommendation (reuse `meta.*Title`) is **OVERRIDDEN**. CONTEXT **D-08** locks the answer-block copy/heading as a **distinct new field**, NOT derived from `meta.*`. Plans author dedicated `answerBlock` / `answerHeading` keys (e.g. `meta.homeAnswerBlock` / `meta.homeAnswerHeading`) per route. **Executors: ignore the "reuse meta.*Title" recommendation below.**
   - ~~Recommendation: reuse existing `meta.*Title` fields~~ — superseded by D-08.
   - D-19 says the block carries the page `<h1>`. The heading content is essentially the page title, but per D-08 it lives in its own field.

2. **`servicesPage.intro` / `home.intro` retire path — RESOLVED by D-15.**
   - D-15 mandates the block **replaces** the existing intro (single lead per page, no stacked double-intros). Plan 03-04 audits and retires the now-dead intro consumers as part of the wiring task. Keys stay only if another consumer still reads them.

3. **`services` index `answerBlock` field location — RESOLVED.**
   - Per plan 03-01 Task 2: index-level blocks nest under existing `meta.*` (`meta.homeAnswerBlock`, `meta.servicesAnswerBlock`, plus the locations-index key) — consistent with the `meta.*Title` pattern; per-service blocks nest under `seo.services[slug].answerBlock` per D-10. Distinct field names per D-08 (see Q1).

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all patterns verified in codebase
- Architecture: HIGH — extends proven Phase 2 patterns directly
- Pitfalls: HIGH — alias constraint is documented in codebase; h1 audit is direct file read
- FAQ distribution: MEDIUM — item counts and cluster assignment are recommendations based on codebase reading; planner should validate intent order with site owner
- Sentence splitter: HIGH — algorithm is straightforward; edge cases bounded by content domain

**Research date:** 2026-06-18
**Valid until:** 2026-07-18 (stable stack, 30-day window)
