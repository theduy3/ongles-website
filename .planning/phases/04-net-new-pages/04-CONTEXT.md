# Phase 4: Net-New Pages - Context

**Gathered:** 2026-06-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Per tenant, per locale (**fr/en only**), build **3 net-new route types** that do not exist today, each wired into `sitemap.ts` for both locales with hreflang alternates and reachable without 404:

1. **Pricing page** (`/tarifs` FR / `/pricing` EN) — structured price table emitting `ItemList` + per-service `AggregateOffer` JSON-LD. → **PAGE-01**
2. **Comparison / decision pages** (4 of them, see P-05) — each ≥200 words unique copy, leading with an `<AnswerBlock>`. → **PAGE-02**
3. **Near-me / neighborhood page** (one borough page per tenant) — ≥150 words unique opening copy, <30% cross-tenant sentence overlap. → **PAGE-03**

Maps to **PAGE-01** (cost/pricing page), **PAGE-02** (comparison/decision pages), **PAGE-03** (near-me/neighborhood pages).

**Brownfield reality:** Phase 1 completed per-tenant facts (NAP/hours/services/pricing via `getStoreConfig()`). Phase 2 shipped typed `Service` + `AggregateOffer` JSON-LD builders in `src/lib/seo.ts`. Phase 3 shipped the shared `<AnswerBlock>` server component (first-in-`<main>`, carries the page `<h1>`), the per-tenant `seo.{locale}.json` content-authoring layer, and the `schema-invariants.ts` + `next.config.ts` build-blocking guard pattern with an offline sentence/word-count detector. **Phase 4 composes all of these into net-new routes** — it does not rebuild them.

**Grounded menu/geography (verified in config):**
- 4 fixed services with localized slugs + price ranges: `pose-ongles` ($60–75, `pose-d-ongles`/`nail-enhancements`), `remplissage` ($45–60), `soins-mains` ($30–40, `soins-des-mains`/`manicure`), `soins-pieds` ($35–60). **Salon offers both gel AND acrylic** within pose-ongles (confirmed by user) — makes a gel-vs-acrylique page legitimate, not fabricated.
- One location per tenant: **maily = Carrefour Beauport (Québec, QC)**, **charlesbourg = Carrefour Charlesbourg (Québec, QC)**, **rivieres = Centre Les Rivières (Trois-Rivières, QC)**. Two tenants share Québec City → near-me pages target the **borough** (Beauport vs Charlesbourg), never the shared city, to avoid cross-tenant cannibalization.

**Not in scope (other phases):** llms.txt depth + GA4 AI-referrer + web-vitals (Phase 5 / LLMS/MEAS); sticky/above-fold CTA hardening (Phase 5 / CONV-01/02); cross-tenant correctness audit (Phase 6). No new service types (4-service catalog fixed). No ES locale (deferred v2). Multiple near-me neighborhoods per tenant, per-service duration data, and per-row pricing blurbs are **deferred** (see Deferred Ideas).
</domain>

<decisions>
## Implementation Decisions

### Route & Locale Strategy
- **P-01 — Localized fr/en slugs:** every net-new route has **distinct FR + EN slugs** (matches the existing service `slug: {fr,en}` convention). FR `/tarifs` ↔ EN `/pricing`; comparison + near-me slugs localized too. Exact slug strings → planner discretion.
- **P-02 — Shared structure, per-tenant copy:** all tenants serve the **same routes/slugs** (one universal Docker image). Uniqueness comes from per-tenant facts + hand-authored copy, NOT different routes (carries D-23).
- **P-03 — Sitemap wiring:** add every new route to `src/app/sitemap.ts` for **both locales** with hreflang alternates via the existing `altLanguages()` helper. Success criterion: all new routes present in sitemap, no 404 on FR or EN.
- **P-04 — Header nav membership:** **pricing + comparisons go in the header nav** (`site.routes`); the **near-me borough page is an SEO landing** reached via footer + locations page + contextual cross-links + sitemap (not header). Note: the header is currently anchor-links into the homepage — adding real route entries is a change.

### Comparison / Decision Pages (PAGE-02)
- **P-05 — Build exactly these 4:** (1) pose d'ongles vs remplissage, (2) manucure vs pédicure, (3) gel vs acrylique, (4) "meilleur pour" decision page. Exceeds the ≥2 minimum.
- **P-06 — gel-vs-acrylique legitimacy:** salon confirmed it offers **both gel and acrylic** as distinct techniques within pose-ongles. Page reflects real services — safe to author and cite.
- **P-07 — "meilleur pour" = single combined page:** covers **both durability AND occasions** (e.g. longue tenue + mariage/vacances) in one decision page. Exact occasions named → planner discretion.
- **P-08 — Depth + lead:** each comparison page ≥200 words unique copy, **leads with `<AnswerBlock>`** (answer-first).
- **P-09 — Fixed section template:** `<AnswerBlock>` (answer-first, carries h1) → side-by-side comparison → "laquelle choisir / which to choose" → CTA. Side-by-side UI (table vs two-column) → planner discretion.

### Near-Me / Neighborhood Pages (PAGE-03)
- **P-10 — One borough page per tenant:** Beauport (maily), Charlesbourg (charlesbourg), Trois-Rivières (rivieres). **Target the borough/landmark, not the shared city** — prevents the two Québec-City tenants competing for the same query.
- **P-11 — Hand-authored per tenant:** copy written by hand in `seo.{locale}.json` (mirrors Phase 3 D-08/D-23). ≥150 words unique opening copy; **<30% cross-tenant sentence overlap**, enforced by build guard.
- **P-12 — Lead + structure:** leads with `<AnswerBlock>` (the ≥150-word opener doubles as the answer block) → local details (address, landmark, hours, services) → CTA.

### Pricing Page (PAGE-01)
- **P-13 — Route + layout:** `/tarifs` (FR) / `/pricing` (EN); **responsive table** (mobile-friendly treatment required).
- **P-14 — Row content:** service name + **price range (`price`–`priceTo` from config)** + book CTA. **Price-only — no net-new data** (no duration, no per-row blurb). Exact numbers per D-29 (this page owns them).
- **P-15 — JSON-LD shape:** **reuse the Phase 2 `Service` + `AggregateOffer` builders** in `src/lib/seo.ts` (untouched per D-28), one `Service` node per row, **wrapped in an `ItemList`**. `price`/`priceTo` → `AggregateOffer` lowPrice/highPrice. The `ItemList` wrapper is the only new builder; validate against Google Rich Results.
- **P-16 — Lead:** page **leads with `<AnswerBlock>`** (answer-first: "combien coûtent les services / what do services cost?") → table → CTA.

### Cross-Cutting
- **P-17 — Build-blocking guard, ROADMAP numbers:** extend `src/config/schema-invariants.ts` (wired into `next.config.ts`) to assert **per tenant per locale**: comparison ≥200 words, near-me ≥150 words, **<30% cross-tenant sentence overlap**, every new route present, and each page's `answerBlock` non-empty (≥2 sentences). **Deploy fails on shortfall** — consistent with Phase 3's D-05/D-11. Reuse Phase 3's offline word/sentence detector (D-13).
- **P-18 — Authoring namespace:** all new copy authored **only** in `seo.{locale}.json` + `dictionaries/{en,fr}.json`; **never** legacy `content.{locale}.json` (carries D-26). `seo-parity.test.ts` extends to cover all new keys (FR/EN parity).
- **P-19 — Full cross-linking:** comparison → relevant service detail + pricing + book; pricing → service detail + book; near-me → home/location + book; service/home pages link back to comparisons + pricing. Maximizes crawl depth + intent flow.
- **P-20 — Multi-tenant constraints:** all new routes `force-dynamic`; never hardcode tenant data; resolve via `getStoreConfig()` / `getSeo()` (carries PROJECT constraints).
- **P-21 — Content style/locale:** FR is source-of-truth, **vous** (D-21); native-quality idiomatic EN (D-24); **fr/en only**, no ES scaffolding (D-25); shared brand voice, per-tenant facts = uniqueness (D-23).

### Claude's Discretion (left to research / planning)
- Exact localized slug strings + header nav labels for all new routes.
- Overlap-measurement method (cross-tenant sentence comparison) — extend Phase 3's D-13 offline detector or a new util; **threshold locked at 30%**.
- Whether the new gates extend `schema-invariants.ts` / `seo-parity.test.ts` or live in new files; test-file layout.
- Comparison side-by-side UI (responsive table vs two-column cards) within the P-09 template.
- "meilleur pour" page: which occasions to name and how the durability + occasion sections compose into one page.
- Sitemap `priority` / `changeFrequency` values for the new route types.
- Near-me route location (top-level borough slug vs nested under `/locations`).
- Whether comparison/near-me reuse the exact `<AnswerBlock>` component or a thin variant.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 4: Net-New Pages" — goal + success criteria (≥150 words unique opening, <30% overlap, all routes in sitemap, no 404; verification target)
- `.planning/REQUIREMENTS.md` — PAGE-01 (cost/pricing page), PAGE-02 (comparison/decision pages), PAGE-03 (near-me/neighborhood pages)
- `.planning/phases/02-schema-completeness-correctness/02-CONTEXT.md` — `Service` + `AggregateOffer` builders (P-15 reuses these), per-tenant `@id` stability
- `.planning/phases/03-content-depth/03-CONTEXT.md` — `<AnswerBlock>` component (D-17/D-18, P-08/P-12/P-16 reuse it), `schema-invariants.ts` build guard (D-05/D-11, P-17 extends it), `seo.{locale}.json` authoring (D-08), namespace boundary (D-26), schema-by-discipline (D-28), qualitative-prose-pricing (D-29)
- `.planning/PROJECT.md` §Constraints — multi-tenant (resolve via `getStoreConfig()`/`resolveTenant()`), `force-dynamic` mandate, FR/EN silent-undefined parity risk, Dokploy webhook deploy
- `.planning/STATE.md` §Accumulated Context — JSON-LD stays pure in `src/lib/seo.ts`; `next.config.ts` is the build guard; `schema-dts` types available

### Code to create / modify
- `src/app/[lang]/tarifs/` (FR) — **NEW** pricing route + page (localized EN slug per P-01)
- `src/app/[lang]/<comparison-slugs>/` — **NEW** 4 comparison routes (P-05)
- `src/app/[lang]/<near-me-slug>/` — **NEW** borough near-me route (P-10; location TBD per discretion)
- `src/app/sitemap.ts` — add all new routes, both locales, hreflang alternates (P-03)
- `src/config/tenants/{id}/site.ts` (`site.routes`) + `src/components/Header.tsx` — header nav entries for pricing + comparisons (P-04)
- `src/config/tenants/{id}/seo.{locale}.json` — comparison + near-me copy + per-page answer blocks (P-08/P-11/P-16)
- `src/config/schema-invariants.ts` (+ test) — word-count + <30% overlap + route-presence + answerBlock guards (P-17)
- `src/config/seo/seo-parity.test.ts` — extend parity to new keys (P-18)
- `src/lib/seo.ts` — compose existing `Service`+`AggregateOffer` into an `ItemList` for the pricing page (Phase 2 builders untouched, P-15/D-28)
- `src/lib/services.ts` — `servicePath` / `servicePathsByLocale` are the localized-slug pattern to mirror (P-01)

### Codebase constraints / reference
- `src/config/types.ts` — `Service` (has `price`/`priceTo`/`slug:{fr,en}`), `Location`, `TenantSite`, `Locale` (`fr|en|es`)
- `src/config/index.ts` — `TENANT_REGISTRY` (the tenant list guards iterate)
- `src/components/AnswerBlock.tsx` — Phase 3 component to reuse (P-08/P-12/P-16)
- `src/app/[lang]/legacy-seo-shim.ts` — legacy `content` namespace folding (D-26: do not grow legacy files)
- `node_modules/next/dist/docs/` — Next.js 16.2.6 is non-standard; read before writing route/build-hook code
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`<AnswerBlock>` server component (Phase 3, D-18)** — first-in-`<main>`, carries page `<h1>`, crawlable prose. Reused as the lead on all 3 new page types (P-08/P-12/P-16).
- **`Service` + `AggregateOffer` builders in `src/lib/seo.ts` (Phase 2)** — composed (not rebuilt) into an `ItemList` for the pricing page (P-15); D-28 keeps them untouched.
- **`schema-invariants.ts` + `next.config.ts` build gate (Phase 2/3)** — the proven block-the-build mechanism; P-17 extends it with word-count/overlap/presence checks rather than adding a new prebuild step. Phase 3's offline sentence/word-count detector (D-13) is reusable for the ≥200/≥150 gates.
- **`seo-parity.test.ts`** — recursive key-path parity across base + 3 tenants; extends to all new `seo.{locale}.json` keys (P-18).
- **Localized-slug pattern** — `Service.slug: {fr,en}` + `servicePath()` / `servicePathsByLocale()` in `src/lib/services.ts`, plus `sitemap.ts`'s per-locale alternates, is the exact template for P-01.
- **`sitemap.ts` `altLanguages()` helper** — hreflang alternates for FR/EN + x-default; new routes plug straight in (P-03).
- **Per-tenant `seo.{locale}.json` + `getSeo()`** — the proven per-tenant content layer for hand-authored comparison/near-me/pricing copy (P-11/P-14).

### Established Patterns
- Content layered: global `getDictionary()` (UI/FAQ) + per-tenant `getSeo()` (SEO copy) + per-tenant `getStoreConfig()` (facts). New page copy lands in `getSeo()`.
- All tenant routes `force-dynamic`; never hardcode tenant data — resolve at render (P-20).
- JSON-LD stays pure in `src/lib/seo.ts`; pages render builder output via `<JsonLd>`.
- New-route scaffolding follows STRUCTURE.md "New Feature" recipe: `src/app/[lang]/<route>/page.tsx` + components + `seo.{locale}.json` keys + dictionary keys + tests.

### Integration Points
- **sitemap.ts** — currently sources routes from `site.routes` + service slugs + home; new routes must register here for both locales (P-03).
- **Header nav** — currently anchor-links into the homepage; adding pricing + comparison entries to `site.routes` changes nav behavior (P-04).
- **Build guard** — `schema-invariants.ts` iterates `TENANT_REGISTRY`; new asserts hook into the same `next.config.ts` wiring (P-17).
- **Pricing schema** — `ItemList` wrapper composes existing `Service`/`AggregateOffer` nodes; one node per row, prices from `price`/`priceTo` (P-15).
</code_context>

<specifics>
## Specific Ideas

- 4 services + price ranges (verified): pose-ongles $60–75, remplissage $45–60, soins-mains $30–40, soins-pieds $35–60. These feed the pricing table + `AggregateOffer` low/high.
- **Gel AND acrylic both offered** within pose-ongles (user-confirmed) — the gel-vs-acrylique comparison reflects real services; authors may state both techniques as fact.
- Borough targeting: maily→**Beauport**, charlesbourg→**Charlesbourg** (both Québec City — must differentiate on borough), rivieres→**Trois-Rivières**. <30% cross-tenant sentence overlap is a real risk for the two Québec tenants — hand-authoring (P-11) is the mitigation, the guard is the backstop.
- One location per tenant; **no per-location detail route** — the near-me page is the borough landing, not a per-address page.
- "Answer-first" lead: the first sentence of each new page must stand alone if an AI engine quotes it (carries Phase 3 D-22).
- Comparison set spans real service pairs (P-05) plus one decision-guide page (P-07) — buying-guide framing AI engines cite well.
</specifics>

<deferred>
## Deferred Ideas

- **Per-service duration on the pricing page** — would enrich UX/schema but duration isn't in config; net-new tenant data. Rejected this phase (P-14 stays price-only).
- **Per-row pricing blurb** — a 1-line description per service row; rejected to keep the pricing page price-focused and low-authoring.
- **Multiple near-me neighborhoods per tenant** — one borough page per tenant this phase (P-10); additional adjacent-neighborhood pages are a later-phase candidate.
- **Exact prices in non-pricing prose** — stays qualitative everywhere except the pricing page + JSON-LD (carries D-29).
- **Shared (non-localized) slugs** — considered, rejected for localized fr/en slugs (P-01).
- **ES-locale content** for the new pages — deferred to v2 (ES-01); fr/en only (P-21).
</deferred>

---

*Phase: 4-Net-New Pages*
*Context gathered: 2026-06-18*
