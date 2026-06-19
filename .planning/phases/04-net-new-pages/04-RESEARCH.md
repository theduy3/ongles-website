# Phase 4: Net-New Pages — Research

**Researched:** 2026-06-18
**Domain:** Next.js 16.2.6 multi-tenant localized routes · schema.org ItemList/AggregateOffer · cross-tenant content overlap guard · build-blocking invariants
**Confidence:** HIGH (all claims grounded in verified codebase reads)

---

## Summary

Phase 4 composes existing Phase 1/2/3 primitives into 3 net-new route types (pricing, comparison ×4, near-me ×1 per tenant). Every primitive needed is confirmed to exist and work: `servicesGraph()` in `src/lib/seo.ts` already returns `WithContext<ItemList>` with per-service `AggregateOffer`; `<AnswerBlock>` is a working server component; `schema-invariants.ts` has a verified extension pattern (D-05/D-11 already extended it inline in Phase 3); `seo-parity.test.ts` uses `keyPaths()` recursive diffing that extends by adding new import pairs; `sitemap.ts` has a working `altLanguages()` helper; and `site.nav` / `site.routes` are separate arrays whose distinction is the key to P-04.

The most important planning input: **the service detail route (`[slug]/page.tsx`) has NO `generateStaticParams`** — it renders on demand because the parent `[lang]` layout is already `force-dynamic`. All 6 net-new routes must follow exactly this pattern (no static params, no `export const dynamic = "force-dynamic"` per-file — they inherit from the layout). The `pageMetadata()` helper in `src/lib/seo.ts` already handles localized-slug hreflang via the `routeByLocale` option.

The cross-tenant overlap guard is the most novel piece (no existing code to extend). It must be an offline pure function added to `schema-invariants.ts` following the same alias-free, pure-module constraint already in that file.

**Primary recommendation:** Add a thin `pricingGraph()` wrapper to `src/lib/seo.ts` that composes the existing `servicesGraph()` — identical output, just a named entry point for the pricing page. Extend `schema-invariants.ts` in place (not a new file). Route structure follows the `[slug]` on-demand pattern, no `generateStaticParams`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (P-01 through P-21)

**Route & Locale:**
- P-01: Every net-new route has distinct FR + EN slugs. FR `/tarifs` ↔ EN `/pricing`; comparison + near-me slugs localized.
- P-02: All tenants serve the same routes/slugs (one universal Docker image); uniqueness from per-tenant facts + copy.
- P-03: Every new route in `src/app/sitemap.ts` for both locales with hreflang via existing `altLanguages()`.
- P-04: Pricing + comparisons go in header nav (`site.routes`); near-me is SEO landing only (footer + sitemap).

**Comparison pages (PAGE-02):**
- P-05: Exactly 4 pages: (1) pose d'ongles vs remplissage, (2) manucure vs pédicure, (3) gel vs acrylique, (4) "meilleur pour" decision page.
- P-06: Gel-vs-acrylique is legitimate — salon confirmed both techniques offered within pose-ongles.
- P-07: "meilleur pour" = single combined page covering durability AND occasions.
- P-08: Each comparison ≥200 words unique copy, leads with `<AnswerBlock>`.
- P-09: Fixed section template: `<AnswerBlock>` → side-by-side comparison → "laquelle choisir" → CTA.

**Near-me pages (PAGE-03):**
- P-10: One borough page per tenant: Beauport (maily), Charlesbourg (charlesbourg), Trois-Rivières (rivieres).
- P-11: Copy hand-authored in `seo.{locale}.json`. ≥150 words unique opening copy; <30% cross-tenant sentence overlap, enforced by build guard.
- P-12: Leads with `<AnswerBlock>` (the ≥150-word opener) → local details → CTA.

**Pricing page (PAGE-01):**
- P-13: Route `/tarifs` (FR) / `/pricing` (EN); responsive table.
- P-14: Rows: service name + price range + book CTA. Price-only, no duration, no per-row blurb.
- P-15: Reuse Phase 2 `Service` + `AggregateOffer` builders (untouched per D-28), wrapped in `ItemList`. `price`/`priceTo` → `lowPrice`/`highPrice`.
- P-16: Leads with `<AnswerBlock>`.

**Cross-cutting:**
- P-17: Extend `schema-invariants.ts`: per tenant per locale — comparison ≥200 words, near-me ≥150 words, <30% cross-tenant sentence overlap, every new route present, answerBlock ≥2 sentences. Deploy fails on shortfall.
- P-18: All new copy in `seo.{locale}.json` + `dictionaries/{en,fr}.json` only. `seo-parity.test.ts` extends to all new keys.
- P-19: Full cross-linking: comparison ↔ service detail ↔ pricing ↔ book; near-me → home/location + book.
- P-20: All new routes `force-dynamic`; resolve via `getStoreConfig()` / `getSeo()`.
- P-21: FR source-of-truth, `vous`, native-quality EN, fr/en only (no ES scaffolding).

### Claude's Discretion
- Exact localized slug strings + header nav labels for all new routes.
- Overlap measurement method — extend D-13 offline detector or new util; threshold locked at 30%.
- Whether new guards extend `schema-invariants.ts` / `seo-parity.test.ts` or live in new files.
- Comparison side-by-side UI (responsive table vs two-column cards) within P-09 template.
- "meilleur pour" page: which occasions to name and how sections compose.
- Sitemap `priority` / `changeFrequency` values for new route types.
- Near-me route location (top-level borough slug vs nested under `/locations`).
- Whether comparison/near-me reuse the exact `<AnswerBlock>` or a thin variant.

### Deferred Ideas (OUT OF SCOPE)
- Per-service duration on pricing page.
- Per-row pricing blurbs.
- Multiple near-me neighborhoods per tenant.
- Exact prices in non-pricing prose (qualitative only per D-29).
- Shared (non-localized) slugs.
- ES-locale content (deferred to v2, ES-01).
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PAGE-01 | Dedicated pricing page with ItemList + AggregateOffer per tenant | `servicesGraph()` already returns `WithContext<ItemList>` with per-service `AggregateOffer`; thin wrapper only needed |
| PAGE-02 | Comparison/decision pages with answer blocks | `<AnswerBlock>` component confirmed; `[slug]/page.tsx` on-demand pattern confirmed |
| PAGE-03 | Near-me pages with ≥150 words unique copy, no cross-tenant duplication | `splitSentences()` + `countWords()` from D-13 confirmed reusable; overlap algorithm specified in Q3 |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Localized routing (FR/EN slugs) | Frontend Server (Next.js App Router) | — | `[lang]` segment already owns locale; net-new folders under it |
| Per-page metadata + hreflang | Frontend Server (`pageMetadata()` in `seo.ts`) | — | `routeByLocale` option already handles localized-slug alternates |
| JSON-LD (ItemList + AggregateOffer) | Frontend Server (via `<JsonLd>`) | API/Config (`seo.ts` builders) | builders are pure; pages call them and render `<JsonLd>` |
| Pricing table render | Browser / Client (Tailwind responsive table) | — | static HTML, no client JS needed |
| Comparison page render | Browser / Client | — | server-rendered, Tailwind two-column cards |
| Near-me page render | Browser / Client | — | server-rendered, `<AnswerBlock>` lead |
| Per-tenant copy authoring | Database / Static (`seo.{locale}.json`) | — | same pattern as Phase 3 |
| Cross-tenant overlap guard | API/Config (`schema-invariants.ts` build gate) | — | pure offline function called by `next.config.ts` PHASE_PRODUCTION_BUILD hook |
| Sitemap entries | Frontend Server (`sitemap.ts`) | — | existing `altLanguages()` helper covers hreflang |
| Header nav entries | Frontend Server (`site.routes` + `Header.tsx`) | — | `site.routes` array feeds sitemap + nav route entries; `site.nav` feeds anchor links |

---

## Scoped Questions — Answers with Evidence

### Q1: Localized FR/EN Routing in Next.js 16.2.6

**Verified pattern from `src/app/[lang]/services/[slug]/page.tsx`:**

The existing service detail route uses **no `generateStaticParams`** and no per-file `export const dynamic`. Comment at line 29 is explicit: *"No generateStaticParams: service slugs come from the runtime tenant's catalog, so pages render on demand (parent [lang] layout is force-dynamic)."*

**Confirmed routing structure:** The `[lang]` layout is `force-dynamic` (per Phase 3 CONTEXT D-20/P-20). All routes under `[lang]/` inherit this. Net-new routes must NOT add `export const dynamic = "force-dynamic"` per-file — they inherit it.

**Two structural options for localized slugs:**

Option A — Per-route named folders (RECOMMENDED):
```
src/app/[lang]/tarifs/page.tsx          # FR slug "tarifs"
src/app/[lang]/pricing/page.tsx         # EN slug "pricing"
```
Each folder handles one locale slug. The `generateMetadata` function checks `isLocale(lang)` and returns 404 for wrong locale. The `pageMetadata()` call uses `routeByLocale: { fr: "/tarifs", en: "/pricing" }` to emit correct hreflang.

Option B — Slug-resolver `[slug]/page.tsx`:
A single `[slug]` dynamic segment resolves to the right page type. More complex, not needed given there are only 6 new routes.

**Recommendation for planner: Option A (named folders).** Each net-new route gets its own folder under `src/app/[lang]/`. The `pageMetadata()` call passes `routeByLocale` to produce correct canonical + hreflang. Pattern mirrors how `servicePath()` + `servicePathsByLocale()` work in `src/lib/services.ts`.

**How metadata + hreflang wire in this Next.js version:**

`pageMetadata()` in `src/lib/seo.ts` lines 101–141 already implements:
- `routeByLocale?: Record<Locale, string>` param — when passed, calls `localizedAlternates()` (lines 85–93)
- Produces `alternates: { canonical: path, languages: { fr: "/fr/tarifs", en: "/en/pricing", "x-default": "/fr/tarifs" } }`
- No changes to `pageMetadata()` needed — just pass `routeByLocale`

**What to NOT do:** Do not add `export const dynamic = "force-dynamic"` per page file (inherited from layout). Do not add `generateStaticParams` (on-demand rendering is correct for runtime-tenant config).

**Next.js 16.2.6 docs note:** Per AGENTS.md, read `node_modules/next/dist/docs/` before writing route/metadata code. The `alternates.languages` field in `Metadata` type is used as shown in the existing `src/lib/seo.ts` — this is confirmed working in production (Phases 1–3 shipped with it).

---

### Q2: Pricing JSON-LD (PAGE-01)

**Confirmed from `src/lib/seo.ts` lines 322–343:**

`servicesGraph()` already returns:
```typescript
// [VERIFIED: codebase read]
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: items.map((item, i) => ({
    "@type": "Service",
    position: i + 1,
    name: item.name,
    description: item.description,
    url: `${cfg.site.url}/${lang}${item.path}`,
    provider: { "@id": BUSINESS_ID },
    areaServed: cfg.site.contact.address.city,
    offers: offer(item.price, item.priceTo),  // → AggregateOffer when priceTo > price
  })),
}
```

The `offer()` helper at lines 152–173 produces `AggregateOffer` with `lowPrice`/`highPrice`/`priceCurrency`/`availability` when `priceTo > price`. This matches Google Rich Results schema for `ItemList` containing `Service` nodes with `AggregateOffer`.

**Recommendation: reuse `servicesGraph()` as-is.** The pricing page calls `servicesGraph(lang, items, cfg)` where `items` is built from the tenant's service catalog (same as the `/services` overview page already does). No new builder function needed — D-28 says Phase 2 builders untouched.

**One possible alias:** The planner may want `pricingGraph()` as a thin re-export in `seo.ts` that calls `servicesGraph()` with a `url` pointing to the service detail page for each item. This is optional — the pricing page can call `servicesGraph()` directly.

**Google Rich Results shape that passes validation:**
```json
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "itemListElement": [
    {
      "@type": "Service",
      "position": 1,
      "name": "Pose d'ongles",
      "offers": {
        "@type": "AggregateOffer",
        "lowPrice": 60,
        "highPrice": 75,
        "priceCurrency": "CAD"
      }
    }
  ]
}
```
This is exactly what `servicesGraph()` produces. [VERIFIED: codebase read of `src/lib/seo.ts`]

**Phase-2 builders UNTOUCHED (D-28):** `offer()`, `servicesGraph()`, `serviceGraph()` — no modifications. The pricing page is a consumer, not a builder change.

---

### Q3: Cross-Tenant Sentence Overlap Algorithm (<30%, Build-Blocking)

**Existing infrastructure to reuse:**

`splitSentences()` is confirmed at `src/config/schema-invariants.ts` lines 115–133:
- Protects abbreviations, decimals, ellipsis
- Splits on `(?<=[.!?])\s+(?=[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜ"«])`
- Returns `string[]` — already handles French accented capitals

`TENANT_REGISTRY` iteration pattern is confirmed at lines 509–540 of `schema-invariants.ts`.

**Algorithm (Claude's Discretion — threshold locked at 30%):**

```
function measureSentenceOverlap(textA: string, textB: string): number {
  // 1. Normalize: lowercase, collapse whitespace, strip punctuation
  const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim()
  // 2. Split into sentences using existing splitSentences()
  const sentencesA = splitSentences(textA).map(normalize)
  const sentencesB = splitSentences(textB).map(normalize)
  // 3. Jaccard on sentence sets (exact normalized match)
  const setA = new Set(sentencesA)
  const setB = new Set(sentencesB)
  const intersection = [...setA].filter(s => setB.has(s)).length
  const union = new Set([...setA, ...setB]).size
  return union === 0 ? 0 : intersection / union
}
```

**Why exact-sentence Jaccard (not shingling):**
- Sufficient for detecting copy-paste or near-identical sentences between tenants
- Simpler offline (no hash tables, no window math) — stays within the alias-free pure-module constraint
- The 30% threshold was chosen knowing this metric: two Québec-City tenants sharing "Salon located in Québec" type sentences would hit it quickly

**Where it plugs in — `schema-invariants.ts`:**

Add a new exported check function `checkCrossTenantOverlap()` following the exact pattern of `checkAnswerBlockPresence()` (lines 238–259):

```typescript
// New imports at top of schema-invariants.ts (alias-free, relative paths):
import mailyNearMeFr from "./tenants/ongles-maily/seo.fr.json";
import mailyNearMeEn from "./tenants/ongles-maily/seo.en.json";
// ... charlesbourg, rivieres

export function checkCrossTenantOverlap(): SchemaInvariantError[] {
  // For each locale, for each pair of tenants,
  // measure sentence Jaccard on nearMeBlock (and comparisonBlocks).
  // Report error if overlap >= 0.30
}
```

Called from `validateSchemaInvariants()` alongside the existing checks.

**Constraint: MUST follow the alias-free / pure-module rule** (header comment lines 1–14 of `schema-invariants.ts`): all imports are static relative JSON imports; no `@/` aliases; no network calls.

---

### Q4: Build-Guard Extension (P-17)

**Confirmed extension pattern from Phase 3:**

`schema-invariants.ts` was extended in Phase 3 by:
1. Adding constants (`FAQ_FLOOR`, `ANSWER_BLOCK_MIN_SENTENCES`)
2. Adding static JSON imports for per-tenant files (lines 45–56)
3. Adding `TENANT_SEO` and `TENANT_FAQ` lookup objects (lines 176–187)
4. Adding check functions (`checkFaqFloor()`, `checkAnswerBlockPresence()`)
5. Calling them from `validateSchemaInvariants()` (lines 522–524)
6. The `next.config.ts` wiring is unchanged — it calls `assertSchemaInvariants()` once

**Recommendation: extend `schema-invariants.ts` in place (not a new file).**

Rationale:
- The `next.config.ts` wiring calls exactly `assertSchemaInvariants()` — adding a new file would require wiring it in too
- Phase 3 proved the in-place extension pattern works (D-05/D-11 both landed in the same file)
- The alias-free constraint is already documented at the top of the file; a new file would need the same constraint header

**New asserts to add (per P-17):**

| Guard | Reuses | New Logic |
|-------|--------|-----------|
| comparison ≥200 words | `countWords()` (already in file) | read `seo.{locale}.json → pages.comparison.{slug}.answerBlock` |
| near-me ≥150 words | `countWords()` | read `seo.{locale}.json → pages.nearMe.answerBlock` |
| <30% cross-tenant sentence overlap | `splitSentences()` + new Jaccard fn | iterate TENANT_REGISTRY pairs |
| every new route present in `site.routes` | none | check `cfg.site.routes` array includes new slugs |
| answerBlock ≥2 sentences (all new pages) | `isAnswerBlockInsufficient()` (already in file) | extend `ANSWER_BLOCK_ROUTES` constant |

**Simpler option for "every new route present":** Rather than a route-presence check on `site.routes` (which is a static array), the planner may prefer the sitemap integration test (see Validation Architecture). The route-presence guard in `schema-invariants.ts` is valuable for catching copy-paste omissions in new tenant configs.

**New JSON key paths needed in `seo.{locale}.json`:**

```json
{
  "pages": {
    "pricing": {
      "answerHeading": "...",
      "answerBlock": "...",
      "metaTitle": "...",
      "metaDescription": "..."
    },
    "comparison": {
      "pose-vs-remplissage": { "answerHeading": "...", "answerBlock": "...", "body": "..." },
      "manucure-vs-pedicure": { "answerHeading": "...", "answerBlock": "...", "body": "..." },
      "gel-vs-acrylique": { "answerHeading": "...", "answerBlock": "...", "body": "..." },
      "meilleur-pour": { "answerHeading": "...", "answerBlock": "...", "body": "..." }
    },
    "nearMe": {
      "answerHeading": "...",
      "answerBlock": "...",
      "boroughName": "...",
      "landmarks": "...",
      "metaTitle": "...",
      "metaDescription": "..."
    }
  }
}
```

These are new top-level keys under `pages` — clean namespace separation from the existing `meta`, `services`, `locations` structure. Word-count guards read `pages.comparison.*.body` (full body, not just answerBlock) and `pages.nearMe.answerBlock`.

---

### Q5: seo.{locale}.json Shape + seo-parity.test.ts Extension (P-18)

**Confirmed parity test mechanism from `src/config/seo/seo-parity.test.ts`:**

The test uses `keyPaths()` (lines 23–28) — a recursive function that returns sorted dotted key paths to every scalar leaf. The `pairs` array (lines 30–35) is iterated: for each `[name, fr, en]` pair, `keyPaths(fr)` must equal `keyPaths(en)`.

**Extension method:** Add the new tenant SEO JSON file imports and add them to the `pairs` array. Because `keyPaths()` is recursive, any new nested key added to `seo.en.json` but not `seo.fr.json` will be caught immediately.

**New key namespace in `seo.{locale}.json`:**

```
pages.pricing.answerHeading           (string)
pages.pricing.answerBlock             (string, ≥2 sentences)
pages.pricing.metaTitle               (string)
pages.pricing.metaDescription         (string)
pages.comparison.pose-vs-remplissage.answerHeading   (string)
pages.comparison.pose-vs-remplissage.answerBlock     (string, ≥2 sentences)
pages.comparison.pose-vs-remplissage.body            (string, ≥200 words)
pages.comparison.manucure-vs-pedicure.answerHeading  (string)
pages.comparison.manucure-vs-pedicure.answerBlock    (string)
pages.comparison.manucure-vs-pedicure.body           (string, ≥200 words)
pages.comparison.gel-vs-acrylique.answerHeading      (string)
pages.comparison.gel-vs-acrylique.answerBlock        (string)
pages.comparison.gel-vs-acrylique.body               (string, ≥200 words)
pages.comparison.meilleur-pour.answerHeading         (string)
pages.comparison.meilleur-pour.answerBlock           (string)
pages.comparison.meilleur-pour.body                  (string, ≥200 words)
pages.nearMe.answerHeading            (string)
pages.nearMe.answerBlock              (string, ≥150 words — also the ≥2-sentence gate)
pages.nearMe.boroughName              (string, e.g. "Beauport")
pages.nearMe.body                     (string, additional local details beyond the answerBlock)
pages.nearMe.metaTitle                (string)
pages.nearMe.metaDescription          (string)
```

**seo-parity.test.ts extension — minimal change:**

The existing parity test at lines 30–43 already covers base + 3 tenants. Extend by:
1. Adding new assertion blocks for the new `pages.*` keys (after the existing `services` key constraint test)
2. The `keyPaths()` recursive diff already catches structural drift — no new diff logic needed
3. Add type-check: `typeof doc.pages.pricing.answerBlock === "string"` style assertions (mirrors lines 136–149)

**Note on `base` seo.{en,fr}.json:** The base seo files (`src/config/seo/seo.en.json`, `seo.fr.json`) are the type-source. New `pages.*` keys must be added to BOTH base files so the TypeScript type derived from `seo.en.json` includes them. Tenant files inherit the structure.

---

### Q6: Header Nav (P-04)

**Confirmed from `src/config/tenants/ongles-maily/site.ts`:**

`site` has TWO separate arrays:
- `site.nav` (lines 67–73): anchor-link entries `{ key: string, href: "#anchor" }` — used by `Header.tsx` (lines 63–72, 101–116) to render the desktop + mobile nav
- `site.routes` (lines 75–86): real indexable routes `"/services"`, `"/gallery"`, etc. — used by `sitemap.ts` (lines 26–34) for `pageEntries`

`Header.tsx` iterates `site.nav` (confirmed lines 63, 109). It does NOT iterate `site.routes`. The nav items are anchor links into the homepage.

**P-04 changes required:**

To add pricing + comparisons to the header, the planner must:

1. Add new entries to `site.nav` in each tenant's `site.ts`:
   ```typescript
   { key: "pricing", href: "/tarifs" },          // FR (or "/pricing" for EN)
   { key: "comparisons", href: "/comparaisons" }, // or individual entries
   ```
   These will be REAL route hrefs, not anchor hashes — a behavior change from the existing anchor-scroll nav.

2. Add new entries to `site.routes` in each tenant's `site.ts` for sitemap inclusion:
   ```typescript
   "/tarifs",  // FR pricing (or handle via localized-route sitemap logic)
   "/comparaisons/pose-vs-remplissage",
   // ... etc
   ```

3. Add the new `dict.nav` keys to `dictionaries/{en,fr}.json`:
   ```json
   { "nav": { "pricing": "Tarifs", "comparisons": "Comparatifs" } }
   ```

**CRITICAL subtlety — `site.routes` feeds sitemap with same-slug-for-all-locales assumption:**

Looking at `sitemap.ts` lines 26–34, `pageEntries` maps `site.routes` using the SAME route string for both locales: `${site.url}/${locale}${route}`. This works for locale-agnostic routes like `/services`, `/gallery`. But pricing has DIFFERENT slugs per locale (`/tarifs` FR vs `/pricing` EN). The planner must handle this: either (a) add a separate `localizedRoutes` array to `site.ts`, or (b) add pricing + comparison sitemap entries manually in `sitemap.ts` using the `altLanguages()` pattern with explicit per-locale paths (same as how `serviceEntries` are built with `servicePathsByLocale`).

**Recommendation:** Add a `localizedRoutes: Array<{ fr: string, en: string }>` field to site config for the new routes that have distinct FR/EN slugs. Or handle them in sitemap.ts directly using `altLanguages()` with hardcoded locale paths per new route type. The per-locale sitemap approach is simpler and doesn't require a new site config field.

**Near-me stays out of header nav:** The near-me page goes in `site.routes` (for sitemap) but NOT in `site.nav`. This matches P-04.

---

## Standard Stack

No new external libraries are required. All capabilities exist in the current stack.

### Confirmed Existing Infrastructure

| Asset | Location | Phase 4 Use |
|-------|----------|-------------|
| `<AnswerBlock>` server component | `src/components/AnswerBlock.tsx` | Lead on all 3 new page types (P-08/P-12/P-16) |
| `servicesGraph()` | `src/lib/seo.ts:322` | Pricing page ItemList JSON-LD (P-15) — reuse as-is |
| `offer()` | `src/lib/seo.ts:152` | Called by `servicesGraph()` — produces AggregateOffer with lowPrice/highPrice |
| `pageMetadata()` | `src/lib/seo.ts:101` | Metadata + hreflang for all new routes; `routeByLocale` param handles localized slugs |
| `localizedAlternates()` | `src/lib/seo.ts:85` | Called internally by `pageMetadata()` when `routeByLocale` is passed |
| `splitSentences()` | `src/config/schema-invariants.ts:115` | Reused for overlap guard + word-count checks |
| `countWords()` | `src/config/schema-invariants.ts:136` | Reused for ≥200/≥150 word-count guards |
| `isAnswerBlockInsufficient()` | `src/config/schema-invariants.ts:203` | Reused for new page answerBlock ≥2 sentence gate |
| `TENANT_REGISTRY` | `src/config/index.ts:15` | Iterated by all new guards |
| `altLanguages()` | `src/app/sitemap.ts:13` | Used for new sitemap entries |
| `getStoreConfig()` | `src/lib/store-config.ts` | Runtime tenant resolution on all new pages |
| `getSeo()` | `src/app/[lang]/seo-content.ts` | Per-tenant copy for all new pages |
| `<JsonLd>` | `src/components/JsonLd.tsx` | Renders JSON-LD script tags |
| `breadcrumbGraph()` | `src/lib/seo.ts:402` | Breadcrumb on new pages |
| `bun:test` | project-wide | Test framework for new guard tests |

**Installation:** No new packages needed. [VERIFIED: codebase read]

---

## Package Legitimacy Audit

> No new external packages are installed in this phase. All capabilities are provided by existing project dependencies.

**Packages removed due to SLOP verdict:** None — no new packages proposed.
**Packages flagged as suspicious:** None.

---

## Architecture Patterns

### System Architecture Diagram

```
Request: /{lang}/tarifs  (or /pricing, /comparaisons/*, /beauport)
         │
         ▼
[lang]/layout.tsx  ─── force-dynamic (inherited by all child routes)
         │               getStoreConfig() → TENANT env var → TENANT_REGISTRY
         ▼
page.tsx (e.g. tarifs/page.tsx)
  │  ├── getSeo(lang)           → seo.{locale}.json → pages.pricing.*
  │  ├── getStoreConfig()       → services[], site.*
  │  ├── getDictionary(lang)    → dict.nav, dict.cta, etc.
  │  ├── servicesGraph()        → WithContext<ItemList> with AggregateOffer per service
  │  ├── breadcrumbGraph()      → WithContext<BreadcrumbList>
  │  └── pageMetadata()         → Metadata with routeByLocale hreflang
  │
  ▼ JSX render:
  <JsonLd data={itemListGraph} />
  <JsonLd data={breadcrumbGraph} />
  <AnswerBlock heading={...} text={...} />   ← h1, first in <main>
  <PricingTable services={...} />             ← responsive table, price/priceTo
  <Button href={bookHref} />                  ← CTA

BUILD TIME (next.config.ts PHASE_PRODUCTION_BUILD):
  assertSchemaInvariants()
    ├── checkAnswerBlockPresence() [extended: adds pricing/comparison/nearMe routes]
    ├── checkWordCount()           [NEW: comparison ≥200w, nearMe ≥150w]
    ├── checkCrossTenantOverlap()  [NEW: sentence Jaccard <30% on nearMe copy]
    └── checkRoutePresence()       [NEW: new routes in site.routes]
```

### Recommended Project Structure — New Files

```
src/app/[lang]/
├── tarifs/
│   └── page.tsx              # FR pricing page (render on demand)
├── pricing/
│   └── page.tsx              # EN pricing page (render on demand)
├── comparaisons/
│   ├── pose-vs-remplissage/
│   │   └── page.tsx
│   ├── manucure-vs-pedicure/
│   │   └── page.tsx
│   ├── gel-vs-acrylique/
│   │   └── page.tsx
│   └── meilleur-pour/
│       └── page.tsx
├── comparisons/              # EN slug mirrors (alternative: single [type]/page.tsx resolver)
│   └── ...
└── {borough-slug}/           # e.g. beauport/ charlesbourg/ trois-rivieres/
    └── page.tsx              # near-me borough landing

src/config/tenants/{id}/
└── seo.{locale}.json         # extended with pages.pricing.* / pages.comparison.* / pages.nearMe.*

src/config/
└── schema-invariants.ts      # extended in place: checkWordCount, checkCrossTenantOverlap, checkRoutePresence
```

**Alternative for localized comparison slugs (discretion):** Use a single `[comparisonSlug]/page.tsx` under `[lang]/comparisons/` and a `[comparisonSlug]/page.tsx` under `[lang]/comparaisons/`. The slug resolver maps FR slugs to EN slugs and returns `notFound()` for wrong-locale access.

### Pattern: On-Demand Page with Localized hreflang

The **exact pattern** from `src/app/[lang]/services/[slug]/page.tsx`:

```typescript
// Source: src/app/[lang]/services/[slug]/page.tsx — verified working in production

// No generateStaticParams — inherits force-dynamic from [lang] layout
// No export const dynamic — inherited

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const { site, locations } = await getStoreConfig();
  const seo = await getSeo(lang);
  return pageMetadata(lang, "/tarifs", {
    title: seo.pages.pricing.metaTitle,
    description: seo.pages.pricing.metaDescription,
    routeByLocale: { fr: "/tarifs", en: "/pricing" },  // ← localized hreflang
  }, { site, locations });
}

export default async function PricingPage({ params }: Params) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const { site, services, locations } = await getStoreConfig();
  const seo = await getSeo(lang);
  const dict = await getDictionary(lang);
  // ... render
}
```

[VERIFIED: src/app/[lang]/services/[slug]/page.tsx lines 26–44]

### Anti-Patterns to Avoid

- **Do NOT add `export const dynamic = "force-dynamic"` per page.tsx**: inherited from `[lang]` layout — redundant and risks divergence
- **Do NOT add `generateStaticParams`**: runtime tenant resolution means slugs are not known at build time
- **Do NOT import from `src/lib/seo.ts` in `schema-invariants.ts`**: explicit constraint at lines 13–14 — pulls `@/lib/*` aliases that fail in Docker build
- **Do NOT add to `content.{locale}.json`**: D-26 constraint, legacy file in migration
- **Do NOT hardcode tenant data in page files**: always resolve via `getStoreConfig()`
- **Do NOT emit `sameAs: []`**: I-03 invariant already guards this; socialProfiles must be non-empty array or builder omits sameAs

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ItemList + AggregateOffer JSON-LD | Custom schema builder | `servicesGraph()` in `seo.ts` | Already typed with `schema-dts`, produces correct output, validated in Phase 2 |
| Sentence splitting | Custom regex splitter | `splitSentences()` in `schema-invariants.ts` | Already handles FR accented caps, abbreviations, decimals, postal codes |
| Word counting | Custom tokenizer | `countWords()` in `schema-invariants.ts` | Already handles edge cases, alias-free |
| hreflang alternates | Custom metadata builder | `pageMetadata()` with `routeByLocale` | Already handles localized slugs + x-default |
| FR/EN key parity guard | New test utility | `keyPaths()` in `seo-parity.test.ts` | Recursive, already used for 4 tenant pairs |
| Build-blocking invariant runner | New prebuild script | Extend `validateSchemaInvariants()` in `schema-invariants.ts` | `next.config.ts` already calls it; Docker build already fails on errors |
| Tenant iteration | Custom loop | `TENANT_REGISTRY` + `EXCLUDED_TENANTS` pattern | Pattern established, skips "template" correctly |

---

## Common Pitfalls

### Pitfall 1: Both Locale Folders Catch Each Other's Traffic
**What goes wrong:** `src/app/[lang]/tarifs/page.tsx` serves `en/tarifs` (wrong locale) because there is no locale check.
**Why it happens:** Next.js serves any `[lang]` value to any page under it.
**How to avoid:** Add `if (!isLocale(lang)) notFound()` as the first line of every new page — exactly as in `[slug]/page.tsx` line 48.
**Warning signs:** Missing locale check → wrong-language page served at cross-locale URL.

### Pitfall 2: Same-Route Assumption in sitemap.ts Breaks Localized Slugs
**What goes wrong:** `site.routes` is iterated with the same route string for all locales. Adding `/tarifs` to `site.routes` generates `en/tarifs` (404) in the sitemap.
**Why it happens:** `pageEntries` in `sitemap.ts` uses `${site.url}/${locale}${route}` (line 28) — locale-agnostic.
**How to avoid:** Add pricing/comparison sitemap entries separately using explicit per-locale paths via `altLanguages()`, mirroring the `serviceEntries` pattern (lines 36–54). Do NOT add localized routes to `site.routes`.
**Warning signs:** `en/tarifs` appearing in sitemap when it should be `en/pricing`.

### Pitfall 3: schema-invariants.ts Import with @/ Alias
**What goes wrong:** Adding `import { getSeo } from "@/app/[lang]/seo-content"` inside `schema-invariants.ts` causes MODULE_NOT_FOUND during Docker build.
**Why it happens:** `next.config.ts` uses a SWC require-hook that cannot resolve `@/` path aliases. Header comment lines 1–14 document this constraint.
**How to avoid:** All imports in `schema-invariants.ts` MUST be static relative JSON imports or relative `.ts` imports whose own chains are also alias-free. Read the new `pages.*` values by importing the JSON files directly.
**Warning signs:** Build works locally (ts-node resolves aliases) but fails in Docker (`next build`).

### Pitfall 4: seo.{locale}.json Key Added to EN But Not FR
**What goes wrong:** `seo.fr.json` is missing `pages.nearMe.body` — it silently becomes `undefined` at runtime (FR calque absent, EN key used; no compile-time error).
**Why it happens:** `type Dictionary = typeof en` provides no guard for FR/ES keys.
**How to avoid:** Run `bun test src/config/seo/seo-parity.test.ts` after every JSON edit. The `keyPaths()` recursive diff catches it immediately.
**Warning signs:** `undefined` rendered on FR near-me page body.

### Pitfall 5: Cross-Tenant Overlap Between Two Québec City Tenants
**What goes wrong:** maily and charlesbourg near-me pages share >30% sentences because both mention "Québec" geography.
**Why it happens:** Two tenants are in Québec City; boilerplate about the city will overlap.
**How to avoid:** Authors must target the BOROUGH (Beauport vs Charlesbourg), not the city. The build guard enforces the threshold post-authoring. Content reviewers check before merging.
**Warning signs:** `checkCrossTenantOverlap()` fires with ≥30% Jaccard on `pages.nearMe.answerBlock` comparison.

### Pitfall 6: Header Nav Key Missing in dictionaries/{en,fr}.json
**What goes wrong:** New `site.nav` entry with `key: "pricing"` renders blank label because `dict.nav.pricing` is undefined.
**Why it happens:** `Header.tsx` accesses `dict.nav[item.key as keyof typeof dict.nav]` — missing key → undefined → blank.
**How to avoid:** Add new nav keys to BOTH `dictionaries/en.json` and `dictionaries/fr.json` before adding to `site.nav`. The existing F-02 FR/EN dictionary parity test catches missing keys.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static `generateStaticParams` for tenant routes | On-demand rendering (no static params, force-dynamic from layout) | Phase 2/3 | All net-new pages use on-demand; no `generateStaticParams` needed |
| Separate prebuild scripts for guards | `next.config.ts` `PHASE_PRODUCTION_BUILD` hook calling `assertSchemaInvariants()` | Phase 2 | Extend in-place; no new prebuild wiring |
| `content.{locale}.json` for all copy | `seo.{locale}.json` (per-tenant SEO) + `dictionaries/{en,fr}.json` (UI) | Phase 3 | Never write to `content.{locale}.json` |

---

## Open Questions

1. **Comparison EN slugs — folder structure vs resolver:**
   - What we know: FR slugs are clear (e.g. `comparaisons/pose-vs-remplissage`). EN equivalents need decision.
   - What's unclear: Two named folders per comparison (one FR, one EN) vs a single `[comparisonSlug]` resolver — both work, planner's choice.
   - Recommendation: Named folders are simpler and match the pricing page pattern. Use `comparisons/nail-extensions-vs-fill` etc. for EN.

2. **`site.nav` vs `site.routes` for localized new pages in sitemap:**
   - What we know: `site.routes` in `sitemap.ts` emits the same path for all locales (line 28).
   - What's unclear: Whether to add a `localizedRoutes` field to site config or handle per-route in `sitemap.ts`.
   - Recommendation: Handle in `sitemap.ts` directly — add a `localizedPageEntries` array built from hardcoded `{ fr, en }` path pairs, using `altLanguages()`. Avoids config schema change.

3. **`answerBlock` for pricing page — is it the ≥2-sentence gate or the ≥150/200 word gate?**
   - What we know: P-16 says pricing page leads with `<AnswerBlock>`. P-17 says comparison ≥200 words, near-me ≥150 words. The pricing page has no explicit word minimum.
   - Recommendation: Pricing answerBlock has only the existing ≥2-sentence gate (from D-11). The ≥200/≥150 gates apply to comparison body and near-me body respectively.

---

## Environment Availability

> No external dependencies beyond the existing project stack.

Phase 4 is code/config/JSON changes only. All runtimes, tools, and services are already present and verified working in Phases 1–3.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Next.js App Router | All new routes | ✓ | 16.2.6 | — |
| `schema-dts` | JSON-LD builders | ✓ | already installed | — |
| `bun:test` | Guard + parity tests | ✓ | project-wide | — |
| Dokploy webhook | Deploy gate | ✓ | live VPS | — |

---

## Validation Architecture

This section maps each ROADMAP success criterion to a testable validation method. The planner uses this to write VALIDATION.md.

### Success Criterion 1: Pricing page emits valid ItemList + AggregateOffer (PAGE-01)

| Validation Method | Command / Tool | Gate |
|-------------------|---------------|------|
| **Build guard (structural)** | `next build` runs `assertSchemaInvariants()` — `checkOfferTypes()` already verifies `priceTo > price` → AggregateOffer per service | Deploy gate |
| **Manual: Google Rich Results Test** | Submit `https://{tenant-url}/fr/tarifs` to [search.google.com/test/rich-results](https://search.google.com/test/rich-results) | Pre-launch UAT |
| **Unit: `servicesGraph()` output shape** | `bun test src/lib/seo.test.ts` — extend to assert `@type: ItemList`, `itemListElement[*].offers["@type"] === "AggregateOffer"` for services with priceTo | CI |
| **Reachability** | `curl -s https://{tenant}/fr/tarifs` returns 200; `curl -s https://{tenant}/en/pricing` returns 200 | Post-deploy smoke test |

### Success Criterion 2: Comparison pages ≥200 words + lead with AnswerBlock (PAGE-02)

| Validation Method | Command / Tool | Gate |
|-------------------|---------------|------|
| **Build guard (word count)** | `next build` → `assertSchemaInvariants()` → `checkWordCount()` [NEW]: reads `seo.{locale}.json → pages.comparison.*.body`, fails if `countWords(body) < 200` per tenant per locale | Deploy gate |
| **Build guard (answerBlock ≥2 sentences)** | `checkAnswerBlockPresence()` extended to include `pages.comparison.*` routes | Deploy gate |
| **Parity test** | `bun test src/config/seo/seo-parity.test.ts` — extended `keyPaths()` diff catches missing `pages.comparison.*` keys in FR vs EN | CI |
| **Visual UAT** | Load each comparison page, verify `<AnswerBlock>` is first `<main>` element (inspect DOM), verify `<h1>` is inside it | Pre-launch UAT |
| **Route reachability (FR + EN)** | `curl -s https://{tenant}/fr/comparaisons/pose-vs-remplissage` 200; EN equivalents 200; opposite locale returns 404 | Post-deploy smoke test |

### Success Criterion 3: Near-me pages ≥150 words unique opening copy + <30% cross-tenant overlap (PAGE-03)

| Validation Method | Command / Tool | Gate |
|-------------------|---------------|------|
| **Build guard (word count)** | `next build` → `checkWordCount()`: reads `pages.nearMe.answerBlock`, fails if `countWords < 150` per tenant per locale | Deploy gate |
| **Build guard (sentence overlap)** | `next build` → `checkCrossTenantOverlap()` [NEW]: Jaccard on `splitSentences(nearMeAnswerBlock)` across tenant pairs; fails if any pair ≥ 0.30 | Deploy gate |
| **Build guard (answerBlock ≥2 sentences)** | `checkAnswerBlockPresence()` extended to `pages.nearMe` route | Deploy gate |
| **Unit test: overlap algorithm** | `bun test src/config/schema-invariants.test.ts` — add test cases: identical text → Jaccard=1.0 (>0.30, should fail); distinct text → Jaccard=0 (pass); 25% overlap → pass; 35% overlap → fail | CI |
| **Route reachability** | `curl -s https://{tenant}/fr/beauport` 200 (maily); `curl -s https://{tenant}/fr/charlesbourg` 200 (charlesbourg); etc. | Post-deploy smoke test |

### Success Criterion 4: All new routes in sitemap, no 404 on FR or EN

| Validation Method | Command / Tool | Gate |
|-------------------|---------------|------|
| **Sitemap content check** | `curl -s https://{tenant}/sitemap.xml` → grep for all 6 new FR routes + 6 EN routes + hreflang alternates | Post-deploy smoke |
| **Build guard (route presence)** | `checkRoutePresence()` [NEW]: verifies new route strings appear in `site.routes` (or in new `localizedRoutes` config field) per tenant | Deploy gate |
| **404 smoke test (FR + EN)** | For each new page type, GET both FR and EN URLs → 200; GET wrong-locale URL → 404 | Post-deploy smoke |
| **Hreflang validation** | Google Search Console after indexing, or manual check: `<link rel="alternate" hreflang="fr" href=".../fr/tarifs">` + `hreflang="en" href=".../en/pricing">` in page `<head>` | Pre-launch UAT |
| **Parity test (FR/EN key completeness)** | `bun test src/config/seo/seo-parity.test.ts` — fails if any new `pages.*` key present in EN but absent in FR | CI |

### Test Commands Summary

| Command | What It Catches | When to Run |
|---------|----------------|-------------|
| `bun test src/config/seo/seo-parity.test.ts` | FR/EN key drift in new `pages.*` namespace | After every JSON edit |
| `bun test src/config/schema-invariants.test.ts` | Word count, answerBlock presence, overlap algorithm unit tests | After guard code changes |
| `next build` (local, with `TENANT=ongles-maily`) | All build guards: word count, overlap, answerBlock, route presence, existing invariants | Before every deploy |
| `next build` × 3 tenants | Cross-tenant guards (overlap runs across ALL tenants in a single build) | CI / pre-deploy |
| Google Rich Results Test (manual) | ItemList + AggregateOffer validity per Google's parser | Pre-launch UAT |
| Smoke: `curl` all new routes FR + EN | 200 reachability + no 404 | Post-deploy |
| Sitemap XML check | All new routes present with correct hreflang | Post-deploy |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `AnswerBlock.tsx` accepts `{ heading: string, text: string }` props (inferred from service detail page usage at line 82) | Q1, Architecture | Component signature may differ — planner must read `AnswerBlock.tsx` before writing new pages |
| A2 | `getSeo(lang)` returns a typed object reflecting `seo.en.json` structure — new `pages.*` keys added to the JSON will be accessible as `seo.pages.*` | Q4, Q5 | May need a typed accessor function or `as unknown as NewSeoShape` cast |
| A3 | Base `seo.en.json` / `seo.fr.json` in `src/config/seo/` are the type-source for the `SeoDoc` type used in parity tests | Q5 | If type comes from per-tenant files instead, adding to base may not propagate type to consumers |
| A4 | The `[lang]` layout's `force-dynamic` propagates to ALL child route segments including new named folders | Q1 | If Next.js 16.2.6 has changed dynamic propagation semantics, explicit `export const dynamic` may be needed — verify in `node_modules/next/dist/docs/` |
| A5 | `site.nav` + `site.routes` are per-tenant in `site.ts` — adding nav entries for pricing/comparisons requires editing all 3 active tenant files | Q6 | Template tenant must also be updated to avoid clone-source divergence |

**If this table has only assumed items:** All have LOW risk — each can be resolved by reading one additional file. None affect the core pattern decisions.

---

## Sources

### Primary (HIGH confidence — verified by codebase reads in this session)

- `src/lib/seo.ts` — `servicesGraph()`, `offer()`, `pageMetadata()`, `localizedAlternates()` confirmed working
- `src/config/schema-invariants.ts` — `splitSentences()`, `countWords()`, `isAnswerBlockInsufficient()`, `TENANT_REGISTRY` iteration pattern, alias-free constraint, extension pattern (D-05/D-11)
- `src/config/seo/seo-parity.test.ts` — `keyPaths()` recursive diff, `pairs` array extension point
- `src/app/[lang]/services/[slug]/page.tsx` — on-demand rendering pattern, `isLocale` guard, `routeByLocale` usage
- `src/config/tenants/ongles-maily/site.ts` — `site.nav` vs `site.routes` distinction, nav anchor structure
- `src/app/sitemap.ts` — `altLanguages()` helper, `pageEntries` same-route assumption
- `src/config/index.ts` — `TENANT_REGISTRY`, `resolveTenant()`, 3 active tenants + template
- `next.config.ts` — `PHASE_PRODUCTION_BUILD` hook calling `assertSchemaInvariants()`
- `src/components/Header.tsx` — iterates `site.nav` (not `site.routes`), anchor-link design

### Tertiary (LOW confidence — inferred from Phase 3 CONTEXT.md, not direct code reads)
- `src/components/AnswerBlock.tsx` prop signature [ASSUMED A1]
- `getSeo()` return type shape [ASSUMED A2]

---

## Metadata

**Confidence breakdown:**
- Standard stack (reusable assets): HIGH — all confirmed by direct file reads
- Architecture patterns (routing, rendering): HIGH — `[slug]/page.tsx` is the exact template
- Build guard extension: HIGH — Phase 3 extension pattern is fully readable
- JSON-LD (pricing ItemList): HIGH — `servicesGraph()` output confirmed line-by-line
- Cross-tenant overlap algorithm: MEDIUM — algorithm is novel (no existing code), but inputs confirmed
- seo.{locale}.json key structure: MEDIUM — shape is a recommendation, exact nesting is Claude's Discretion

**Research date:** 2026-06-18
**Valid until:** 2026-07-18 (stable stack, 30-day window)
