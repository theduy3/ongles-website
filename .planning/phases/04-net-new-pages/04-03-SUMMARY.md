---
phase: 04-net-new-pages
plan: "03"
subsystem: seo-pages
tags: [near-me, borough, tdd, overlap-guard, word-count-guard, nap-panel]
dependency_graph:
  requires: [04-01, 04-02]
  provides: [PAGE-03]
  affects: [schema-invariants, seo-json, site-routes, app-routes]
tech_stack:
  added: []
  patterns: [on-demand-route, answer-first, tdd-red-green, jaccard-overlap-guard]
key_files:
  created:
    - src/components/NearMeDetails.tsx
    - src/app/[lang]/beauport/page.tsx
    - src/app/[lang]/charlesbourg/page.tsx
    - src/app/[lang]/trois-rivieres/page.tsx
  modified:
    - src/config/schema-invariants.ts
    - src/config/schema-invariants.test.ts
    - src/config/tenants/ongles-maily/seo.fr.json
    - src/config/tenants/ongles-maily/seo.en.json
    - src/config/tenants/ongles-charlesbourg/seo.fr.json
    - src/config/tenants/ongles-charlesbourg/seo.en.json
    - src/config/tenants/ongles-rivieres/seo.fr.json
    - src/config/tenants/ongles-rivieres/seo.en.json
    - src/config/tenants/ongles-maily/site.ts
    - src/config/tenants/ongles-charlesbourg/site.ts
    - src/config/tenants/ongles-rivieres/site.ts
decisions:
  - "checkNearMeWordCount() private helper isolates nearMe scope — avoids misfiring on empty comparison.body placeholders until 04-05 wires that branch"
  - "Borough slugs serve both FR+EN (proper nouns; no wrong-locale guard unlike /tarifs vs /pricing)"
  - "DayHours.label/value shape confirmed from Location type — not {days,opens,closes}"
  - "dict.locations.heading (not .title) is the correct breadcrumb label key"
  - "Comparison body word-count coverage deferred to 04-05; only nearMe scope activated here"
metrics:
  duration: "~3h (two-session)"
  completed: "2026-06-19"
  tasks_completed: 3
  files_changed: 11
status: complete
---

# Phase 04 Plan 03: Borough Near-Me Landings Summary

Borough-targeted near-me SEO landing pages for all 3 tenants: Beauport (ongles-maily), Charlesbourg (ongles-charlesbourg), Trois-Rivières (ongles-rivieres) — answer-first ≥150-word unique copy with build-guard enforced <30% cross-tenant Jaccard overlap, NearMeDetails NAP/hours panel, routes in site.routes (not site.nav).

## What Was Built

### Task 1 — Near-me copy + guard activation (TDD RED→GREEN)

**RED commit `d35c380`:** Added 3 describe blocks to `schema-invariants.test.ts`:
- `04-03: checkWordCount — nearMe guard bites on short/empty copy` — proves guard fires below 150 words
- `04-03: checkCrossTenantOverlap — identical-copy fail-fixture` — Jaccard=1.0 on identical, <0.30 on distinct
- `04-03: validateSchemaInvariants — zero nearMe errors (integration GREEN)` — integration test expected 0 errors (failed RED because guards not yet wired)

Result: 128 pass, 1 fail (integration test, as expected).

**GREEN commit `0370275`:** In `schema-invariants.ts`:
- Added private `checkNearMeWordCount()` — iterates `TENANT_SEO[id][locale].pages.nearMe.answerBlock`, fires `P4-wordcount` error below `NEAR_ME_WORD_FLOOR = 150`
- Wired both guards in `validateSchemaInvariants()`: `errors.push(...checkNearMeWordCount()); errors.push(...checkCrossTenantOverlap())`
- Authored `pages.nearMe` in 6 JSON files (FR + EN per tenant):

| Tenant | Borough | FR words | EN words | Key landmarks |
|--------|---------|----------|----------|---------------|
| ongles-maily | Beauport | 175 | 164 | Carrefour Beauport, rue du Carrefour, A-40 Félix-Leclerc, Giffard/Montmorency |
| ongles-charlesbourg | Charlesbourg | 178 | 162 | Henri-Bourassa corridor, Carrefour Charlesbourg, Laurentides/Trait-Carré, Val-Bélair |
| ongles-rivieres | Trois-Rivières | 174 | 159 | Centre Les Rivières, boulevard des Forges, Vieux-Trois-Rivières, Cap-de-la-Madeleine |

All pairwise Jaccard overlap = **0.000** (different city for rivieres; different district framing for maily/charlesbourg).

Result: 346 pass, 0 fail.

### Task 2 — NearMeDetails component + 3 borough route pages (TDD GREEN)

**Commit `f502f5a`:** Created:

**`src/components/NearMeDetails.tsx`** — server component (no "use client"). Props: `{ lang, location, site, services, serviceNames }`. Renders white `shadow-card rounded-2xl` panel:
- NAP: `site.name`, `location.landmark` eyebrow, address `line1`/`line2`, `tel:` phone link
- Hours: `location.hours.map(row => row.label : row.value)` — `DayHours` shape (`label`/`value` not `days/opens/closes`)
- Service links: compact `<ul>` linking to `/${lang}${servicePath(svc, lang)}`
- Book CTA: `<a href={bookHref}>` styled espresso pill

**3 borough pages** following 04-02 named-folder pattern:
- `isLocale(lang)` guard → `notFound()` first
- `generateMetadata` with `routeByLocale: { fr: "/borough", en: "/borough" }` (same slug both locales)
- No `generateStaticParams`, no per-file `export const dynamic`
- Render: `breadcrumbGraph` JsonLd (Home → `dict.locations.heading` → boroughName), `<AnswerBlock>` (h1), `<NearMeDetails>`, CTA row (Book solid + Call ghost + Locations ghost)

**`site.routes`** updated for all 3 tenants:
- `ongles-maily/site.ts`: added `/beauport`
- `ongles-charlesbourg/site.ts`: added `/charlesbourg`
- `ongles-rivieres/site.ts`: added `/trois-rivieres`
- `site.nav` arrays unchanged (P-04 requirement)

### Task 3 — Checkpoint auto-approved (human_verify_mode=end-of-phase)

UAT material harvested to `.planning/phases/04-net-new-pages/04-UAT.md`. Visual verification deferred to end-of-phase UAT session covering all 5 plans together.

## Test Results

```
346 pass, 0 fail, 754 expect() calls
28 files, 179ms
```

TypeScript (`tsc --noEmit`): zero errors in new files. Pre-existing errors limited to bun type declarations and a duplicate `faqPageGraph` identifier in test file (both pre-existing, not introduced here).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] DayHours shape mismatch in NearMeDetails**
- Found during: Task 2 implementation
- Issue: Initial draft used `{ days, opens, closes }` fields from `schema.org/openingHours`. Actual `DayHours` type is `{ label: string; value: string }` (human-readable pair)
- Fix: Removed `formatHoursRow()` function, changed rendering to `{row.label} : {row.value}`
- Files modified: `src/components/NearMeDetails.tsx`

**2. [Rule 1 - Bug] dict.locations.heading vs .title**
- Found during: Task 2 — borough page breadcrumb construction
- Issue: Used `dict.locations?.title` which does not exist in Dictionary type; silently becomes `undefined`
- Fix: Replaced with `dict.locations.heading` (= "Nous trouver" / "Find us") in all 3 borough pages
- Files modified: `src/app/[lang]/beauport/page.tsx`, `src/app/[lang]/charlesbourg/page.tsx`, `src/app/[lang]/trois-rivieres/page.tsx`

**3. [Rule 2 - Design clarification] checkNearMeWordCount private helper (nearMe scope isolation)**
- Plan said "gate comparison coverage behind a slug-present check" for `checkWordCount()`
- Chosen implementation: private `checkNearMeWordCount()` helper that only checks `pages.nearMe.answerBlock`, leaving exported `checkWordCount()` untouched and available for its original scope
- Rationale: Cleaner than adding a conditional branch to the existing `checkWordCount()` for a known-temporary placeholder situation; 04-05 will add the comparison scope cleanly alongside this
- No functional difference from the plan's intent

## Known Stubs

None. Borough copy is fully authored; word-count and overlap guards are live.

## Threat Flags

None. No new network endpoints, auth paths, or trust-boundary schema changes. Borough pages are read-only public routes consuming existing `getStoreConfig()` + `getSeo()`.

## Self-Check: PASSED

### Files exist

- FOUND: src/components/NearMeDetails.tsx
- FOUND: src/app/[lang]/beauport/page.tsx
- FOUND: src/app/[lang]/charlesbourg/page.tsx
- FOUND: src/app/[lang]/trois-rivieres/page.tsx

### Commits exist

- FOUND: d35c380 (test RED)
- FOUND: 0370275 (feat GREEN — copy + guards)
- FOUND: f502f5a (feat — NearMeDetails + borough pages + site.routes)
