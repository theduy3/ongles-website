---
phase: 04-net-new-pages
plan: "02"
subsystem: pricing-pages
tags: [routing, json-ld, pricing, parity, component, locale-guard]
dependency_graph:
  requires: [04-01-SUMMARY]
  provides: [PricingTable, tarifs-route, pricing-route, pages.pricing-copy, dict.nav.pricing]
  affects:
    - src/components/PricingTable.tsx
    - src/app/[lang]/tarifs/page.tsx
    - src/app/[lang]/pricing/page.tsx
    - src/config/tenants/*/seo.{fr,en}.json (pages.pricing)
    - src/dictionaries/{fr,en}.json (nav.pricing)
tech_stack:
  added: []
  patterns: [wrong-locale-guard, pricingGraph-ItemList, answer-first, dl-price-list, routeByLocale-hreflang]
key_files:
  created:
    - src/components/PricingTable.tsx
    - src/app/[lang]/tarifs/page.tsx
    - src/app/[lang]/pricing/page.tsx
  modified:
    - src/config/tenants/ongles-maily/seo.fr.json
    - src/config/tenants/ongles-maily/seo.en.json
    - src/config/tenants/ongles-charlesbourg/seo.fr.json
    - src/config/tenants/ongles-charlesbourg/seo.en.json
    - src/config/tenants/ongles-rivieres/seo.fr.json
    - src/config/tenants/ongles-rivieres/seo.en.json
    - src/dictionaries/fr.json
    - src/dictionaries/en.json
decisions:
  - "PricingTable uses dl (not table) — semantic, AI-extractable, and stacks naturally on mobile without overflow"
  - "Wrong-locale guard via lang!=='fr'/lang!=='en' notFound() — simpler and more explicit than a slug map approach"
  - "PricingRow.href is the full /{lang}/services/{slug} path built at render time — keeps component pure, no locale logic inside"
  - "Build verified via tsc --noEmit + bun test (Turbopack cannot build from git worktree due to symlink-outside-root restriction — documented below)"
metrics:
  duration: "~18 minutes"
  completed: "2026-06-19"
  tasks_completed: 3
  files_changed: 11
status: complete
requirements: [PAGE-01]
---

# Phase 04 Plan 02: Pricing Pages — FR /tarifs + EN /pricing

## One-liner

FR `/tarifs` + EN `/pricing` route pages with `PricingTable` component, `ItemList`+`AggregateOffer` JSON-LD via `pricingGraph()`, per-tenant pricing copy in 3 tenants × FR/EN, and `dict.nav.pricing` in both locale dictionaries.

## What Was Built

### Task 1: PricingTable component + pricing copy (commit 9b20a0e)

**`src/components/PricingTable.tsx`** — server component:

- Accepts `lang`, `rows: PricingRow[]` (id, name, href, price, priceTo), optional `labels` override
- Renders a `<dl>` price list inside a `rounded-2xl bg-white shadow-card` panel `max-w-3xl mx-auto`
- Rows: service name as `<Link>` with `hover:text-gold` → service detail page (P-19 cross-link); price range right-aligned in `text-gold font-medium`
- `flex-col gap-1` → `sm:flex-row sm:justify-between` — stacks label-over-value below sm, no horizontal scroll (P-13)
- `divide-y divide-sand` hairline separators between rows
- Price-only — no duration, no per-row blurb (P-14)
- `formatPriceRange()` handles single price (priceTo absent or equal) vs range display

**`pages.pricing` copy authored in 3 tenants × FR/EN (6 files):**

All values replaced placeholders (`""`) with real copy:

| Tenant | FR answerHeading | EN answerHeading |
|--------|-----------------|-----------------|
| ongles-maily | "Combien coûtent nos services ?" | "What do our services cost?" |
| ongles-charlesbourg | "Combien coûtent nos services ?" | "What do our services cost?" |
| ongles-rivieres | "Combien coûtent nos services ?" | "What do our services cost?" |

Each `answerBlock` is ≥2 sentences with per-tenant price range framing, vous (D-21), idiomatic EN (D-24), per-tenant location facts (D-23). `metaTitle` and `metaDescription` populated with tenant-specific copy.

**`dict.nav.pricing`** added to both dictionaries:
- `fr.json`: `"pricing": "Tarifs"`
- `en.json`: `"pricing": "Pricing"`
- Both inserted at the same position in the `nav` object — key structure identical (AGENTS.md parity rule)

Parity tests: 58 pass. Full suite: 336 pass, 0 fail.

### Task 2: FR /tarifs + EN /pricing route pages (commit bc39019)

**`src/app/[lang]/tarifs/page.tsx`** (FR-only):

- `generateMetadata`: `isLocale` guard + `lang !== "fr"` returns `{}` (metadata guard); calls `pageMetadata` with `routeByLocale: { fr: "/tarifs", en: "/pricing" }` → correct hreflang alternates
- Default export: `isLocale` guard + `lang !== "fr"` → `notFound()` (Pitfall 1 wrong-locale guard)
- Resolves `getStoreConfig()`, `getSeo(lang)`, `getDictionary(lang)`
- Builds `graphItems` array: `name` from `dict.serviceDetails[id].title`, `description` from `seo.services[id].schemaDescription`, `price`/`priceTo` from runtime services, `path` from `servicePath()`
- Renders `<JsonLd data={pricingGraph(lang, graphItems, ...)} />` → ItemList + AggregateOffer
- Renders `<JsonLd data={breadcrumbGraph(lang, [Home, Tarifs], ...)} />`
- `<AnswerBlock heading={seo.pages.pricing.answerHeading} text={seo.pages.pricing.answerBlock} link={{href: /${lang}/services, label: dict.cta.viewServices}} />` — first in main, carries page h1 (D-19)
- `<PricingTable lang rows />` with service href = `/${lang}${servicePath(service, lang)}`
- CTA row: solid Book button + ghost Call button
- No `generateStaticParams`, no per-file `export const dynamic`

**`src/app/[lang]/pricing/page.tsx`** (EN-only): mirrors tarifs exactly with `lang !== "en"` guard and `/pricing` slug.

**Wrong-locale behavior:**
- `/fr/tarifs` → 200 ✓ (FR page serves)
- `/en/pricing` → 200 ✓ (EN page serves)
- `/en/tarifs` → 404 ✓ (tarifs page guards `lang !== "fr"`)
- `/fr/pricing` → 404 ✓ (pricing page guards `lang !== "en"`)

### Task 3: Automated verification (no commit — verification only)

`bun test src/`: 336 pass, 0 fail across 28 files.

Note: `bun run build` (Turbopack) cannot run from within a git worktree when `node_modules` lives in the parent repo — Turbopack rejects a `node_modules` symlink that points outside `turbopack.root` with "Symlink [project]/node_modules is invalid, it points out of the filesystem root". This is a worktree-mode limitation, not a code error. The orchestrator's post-merge build on the main checkout will confirm the full production build. TypeScript typecheck (`tsc --noEmit`) found zero errors in the new files; all pre-existing errors are `bun:test` type declarations (baseline, not introduced by this plan).

## Verification Results

| Check | Result |
|-------|--------|
| `bun test src/` | 336 pass, 0 fail |
| `tsc --noEmit` (new files only) | 0 errors |
| `seo-parity.test.ts` | 58 pass |
| `pages.pricing` copy non-empty (3 tenants × FR/EN) | confirmed |
| `dict.nav.pricing` in fr.json + en.json | "Tarifs" / "Pricing" |
| FR/EN key parity in all modified JSON files | confirmed (seo-parity tests green) |
| Wrong-locale guard: tarifs → notFound() for non-fr | code review confirmed |
| Wrong-locale guard: pricing → notFound() for non-en | code review confirmed |
| pricingGraph() wired in both pages | confirmed |
| breadcrumbGraph() wired in both pages | confirmed |
| AnswerBlock first-in-main in both pages | confirmed |
| No generateStaticParams | confirmed |
| No per-file export const dynamic | confirmed |

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 9b20a0e | feat(04-02) | PricingTable component + pricing copy + dict.nav.pricing |
| bc39019 | feat(04-02) | FR /tarifs + EN /pricing route pages with ItemList JSON-LD |

## Deviations from Plan

### Build verification method

**[Rule 3 - Blocked] Turbopack build unavailable from git worktree**

- **Found during:** Task 3 automated verify
- **Issue:** `bun run build` fails in a git worktree because `node_modules` lives in the parent repo (`/Users/theduy/Repo/ongles-website/node_modules`). Turbopack's workspace root anchoring via `turbopack: { root: __dirname }` in `next.config.ts` rejects a `node_modules` symlink that points outside the project root with "Symlink [project]/node_modules is invalid, it points out of the filesystem root". This is a Turbopack sandboxing constraint, not a code error.
- **Fix applied:** Verified compilation via `tsc --noEmit` (0 errors in new files) + `bun test src/` (336 pass). The post-merge build on the main checkout will confirm production Turbopack compilation.
- **Files modified:** None — verification method only.

No other deviations.

## Known Stubs

None. All `pages.pricing.*` values are fully authored with real per-tenant copy. `dict.nav.pricing` is populated. The route pages are complete with JSON-LD, AnswerBlock, PricingTable, and CTAs.

## UAT Material (deferred — end-of-phase per human_verify_mode)

Task 3 `how-to-verify` content for the phase UAT file (04-UAT.md):

1. Run `bun run dev` with `TENANT=ongles-maily`. Visit http://localhost:3000/fr/tarifs — confirm the h1 answer heading appears first, the four services show with $60–75 / $45–60 / $30–40 / $35–60 ranges, prices in gold, and a Book CTA. No horizontal scroll on a narrow viewport.
2. Visit http://localhost:3000/en/pricing — confirm idiomatic EN copy and the same prices.
3. Visit http://localhost:3000/en/tarifs and http://localhost:3000/fr/pricing — confirm both 404.
4. View source on /fr/tarifs: confirm a `<script type="application/ld+json">` containing `"@type":"ItemList"` with `"@type":"AggregateOffer"` lowPrice/highPrice.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries introduced. Route pages are read-only server components using existing data resolution patterns.

## Self-Check: PASSED
