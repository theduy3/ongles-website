---
phase: 04-net-new-pages
plan: "05"
subsystem: sitemap, nav, schema-invariants, dictionaries
tags: [sitemap, hreflang, nav, localized-routes, build-guard, route-presence, uat]
dependency_graph:
  requires: [04-02, 04-03, 04-04]
  provides: [localizedPageEntries, checkRoutePresence-live, nav-pricing-comparisons, phase-UAT]
  affects: [sitemap.ts, Header.tsx, schema-invariants.ts, all-tenant-site.ts, dictionaries]
tech_stack:
  added: [hrefByLocale nav field, LocalizedPathPair sitemap type]
  patterns: [localizedPageEntries per-locale hreflang, navHref locale-aware resolver]
key_files:
  created: [.planning/phases/04-net-new-pages/04-UAT.md]
  modified:
    - src/app/sitemap.ts
    - src/config/schema-invariants.ts
    - src/config/schema-invariants.test.ts
    - src/components/Header.tsx
    - src/config/types.ts
    - src/config/tenants/ongles-maily/site.ts
    - src/config/tenants/ongles-charlesbourg/site.ts
    - src/config/tenants/ongles-rivieres/site.ts
    - src/config/tenants/template/site.ts
    - src/dictionaries/fr.json
    - src/dictionaries/en.json
decisions:
  - "localizedPageEntries uses explicit {fr, en} path pairs (not site.routes) to avoid same-slug hreflang bug (Pitfall 2)"
  - "checkRoutePresence redesigned to check borough near-me slugs in site.routes (pricing/comparisons NOT in site.routes per plan prohibition)"
  - "hrefByLocale optional nav field added to TenantSite.nav; navHref() resolver in Header handles both anchor and locale-distinct real routes"
  - "comparisons nav entry links to lead comparison (pose-vs-remplissage / nail-extensions-vs-fill) as hub entry"
metrics:
  duration: "~45 minutes"
  completed: "2026-06-19"
  tasks_completed: 3
  tasks_total: 4
  files_modified: 11
  tests_before: 135
  tests_after: 138
status: complete
---

# Phase 04 Plan 05: Integration + Activation Summary

Integration and activation wave closing Phase 04 — wires all net-new routes into sitemap with correct hreflang, adds pricing and comparisons to header nav with locale-aware href resolution, activates the route-presence build guard, and authors the consolidated phase UAT manifest.

## What Was Built

### Task 1: sitemap `localizedPageEntries` + `checkRoutePresence` activation

**sitemap.ts** — Added a `localizedPageEntries` block built from explicit `{ fr, en }` path pairs:
- Pricing: `{ fr: "/tarifs", en: "/pricing" }` — emits `/fr/tarifs` and `/en/pricing` entries, each with `alternates.languages: { fr: /fr/tarifs, en: /en/pricing, x-default: /fr/tarifs }`
- 4 comparisons via `COMPARISONS.map(c => ({ fr: /comparaisons/${c.slug.fr}, en: /comparisons/${c.slug.en} }))` — 8 additional entries
- Uses `buildLocalizedPageEntries()` helper mirroring the `serviceEntries` pattern (per-locale URL + explicit hreflang — NOT the same-slug `altLanguages()` pattern used for `pageEntries`)
- Borough near-me routes (proper nouns, same slug FR+EN) remain in `pageEntries` via `site.routes`

**schema-invariants.ts** — Redesigned `checkRoutePresence()`:
- Old logic checked for "tarifs" in `site.routes` — wrong, since pricing/comparison routes must NOT be in `site.routes`
- New logic: checks each live tenant has its borough near-me slug in `site.routes` (`/beauport` for maily, `/charlesbourg` for charlesbourg, `/trois-rivieres` for rivieres)
- `TENANT_BOROUGH_ROUTE` constant maps tenant ID → required slug
- Wired into `validateSchemaInvariants()` with `errors.push(...checkRoutePresence())`

**schema-invariants.test.ts** — Added 04-05 test block (3 tests):
- Fail-fixture: proves guard passes when all borough slugs are registered
- Wiring test: proves `validateSchemaInvariants()` includes P4-route results
- Integration: proves full suite stays clean after wiring

### Task 2: Header nav entries for pricing + comparisons

**dictionaries** — Added `nav.comparisons` key to both locales:
- `en.json`: `"comparisons": "Comparisons"`
- `fr.json`: `"comparisons": "Comparatifs"`
- Dictionary parity maintained (F-02 guard stays green)

**config/types.ts** — Extended `TenantSite.nav` item type to support optional `hrefByLocale?: Partial<Record<string, string>>` for routes with locale-distinct slugs.

**Header.tsx** — Added `navHref()` resolver:
- Resolves `item.hrefByLocale?.[locale] ?? item.href` before applying locale prefix
- Used in both desktop nav (`hidden lg:flex`) and mobile drawer (`lg:hidden`)
- Existing anchor links (services, gallery, etc.) unaffected — `hrefByLocale` absent → falls through to `href`

**All tenant site.ts (ongles-maily, ongles-charlesbourg, ongles-rivieres, template)** — Added two nav entries:
- `{ key: "pricing", href: "/tarifs", hrefByLocale: { fr: "/tarifs", en: "/pricing" } }` — renders "Tarifs" (FR) / "Pricing" (EN), navigates to correct locale route
- `{ key: "comparisons", href: "/comparaisons/pose-vs-remplissage", hrefByLocale: { fr: "/comparaisons/pose-vs-remplissage", en: "/comparisons/nail-extensions-vs-fill" } }` — lead comparison as hub entry
- Borough near-me routes deliberately excluded from nav (P-04 prohibition)

### Task 3: Consolidated 04-UAT.md

Rewrote Wave 3's 96-line UAT into a 200+ line full phase manifest covering:
- SC1–SC4 status table (automated green now vs manual post-deploy)
- Guard inventory table with all 7 active guards and their invariant codes
- Per-SC manual verification steps with exact curl commands and expected outputs
- ComparisonColumns deferral documented as an explicit open human-review gate
- AI-citation carry-forward (non-blocking, post-indexing)
- Wave-by-wave completion summary

### Task 4: checkpoint:human-verify (auto-approved — end-of-phase mode)

Automated checks confirmed:
- `bun test src/`: 355 pass, 0 fail
- `bun test src/config/schema-invariants.test.ts`: 138 pass (up from 135)
- `bun test src/config/seo/seo-parity.test.ts`: 58 pass
- All structural checks: `localizedPageEntries` present in sitemap, `checkRoutePresence` wired, `navHref` in Header both desktop+mobile, `comparisons` key in both dictionaries

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written.

### Design Decision: checkRoutePresence scope change

**Found during:** Task 1 analysis

**Issue:** The existing `checkRoutePresence()` checked for "tarifs" in `site.routes`, but the 04-05 plan explicitly prohibits adding pricing/comparison routes to `site.routes`. The original implementation was a placeholder that would always fire (since tarifs is never in site.routes).

**Fix:** Redesigned to check for borough near-me slugs in `site.routes` — these ARE the per-tenant routes that belong there. Pricing/comparison routes are verified implicitly by the `localizedPageEntries` source-of-truth constant in sitemap.ts.

**Files modified:** `src/config/schema-invariants.ts`, `src/config/schema-invariants.test.ts`

**Commit:** `de06787`

### Design Decision: hrefByLocale extension for locale-distinct nav hrefs

**Found during:** Task 2 — Header's `href()` helper prefixes `/{locale}` to a single path, which would generate `/en/tarifs` (404) and `/fr/pricing` (404) for pricing.

**Fix:** Added optional `hrefByLocale` map to `TenantSite.nav` item type; added `navHref()` resolver in Header that uses locale-specific path before prefix. Backward-compatible — existing anchor links unaffected.

**Files modified:** `src/config/types.ts`, `src/components/Header.tsx`

**Commit:** `2004ef4`

## Known Stubs

None — all new routes are wired to real content. The `comparisonPathsByLocale` import in sitemap.ts has a `void` reference to prevent dead-import stripping; this is intentional documentation of the module dependency.

## Threat Flags

None — no new network endpoints, auth paths, or trust-boundary schema changes. sitemap.ts and Header.tsx are read-only public surfaces consuming existing config.

## Self-Check: PASSED

All files exist on disk. All commits present in git log:
- `de06787` feat(04-05): sitemap localizedPageEntries + wire checkRoutePresence
- `2004ef4` feat(04-05): header nav pricing + comparisons entries, locale-aware hrefs
- `ff91ae4` docs(04-05): author consolidated phase 04 UAT manifest

355 tests pass. 0 failures.
