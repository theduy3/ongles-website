---
phase: 05-llms-txt-depth-measurement
plan: "02"
subsystem: llms-txt-route
status: complete
tags: [tdd, llms-txt, cross-tenant-leak-fix, canonicalUrl, multi-tenant]
dependency_graph:
  requires:
    - TenantSite.llmsDescription field (05-01)
    - TenantSite.canonicalUrl field (Phase 2 I-01)
    - getStoreConfig() with site + services (store-config.ts)
    - TENANT_REGISTRY (config/index.ts)
  provides:
    - src/app/llms.txt/route.ts — tenant-resolved route, zero hardcoded tenant facts
    - src/app/llms.txt/route.test.ts — 57-test per-tenant suite (no-leak + structure)
  affects:
    - src/app/llms.txt/route.ts
    - src/app/llms.txt/route.test.ts
tech_stack:
  patterns:
    - mock.module("@/lib/store-config") mutable-closure pattern (reuses admin/layout.test.ts pattern)
    - TENANT_REGISTRY iteration excluding "template" (reuses schema-invariants.test.ts pattern)
    - site.canonicalUrl as link host (reuses Phase 2 I-01 scheme)
    - site.routes.at(-1) for borough near-me slug
key_files:
  created:
    - src/app/llms.txt/route.test.ts
  modified:
    - src/app/llms.txt/route.ts
decisions:
  - "Use TENANT_REGISTRY direct import in tests (not process.env.TENANT) to test all live tenants without env manipulation"
  - "Comparison slugs inlined in route.ts (not imported from comparisons.ts) to avoid server-lib coupling in a route file — single divergence point is comparisons.ts"
  - "site.routes.at(-1) as near-me slug contract — established by site config ordering (not a fragile hack: each tenant.site.routes explicitly places borough last)"
  - "site.llmsDescription fallback: empty = derive minimal sentence from contact facts, not build failure; depth guard stays unwired until 05-05"
  - "Québec exclusion in no-leak signal list: both maily and charlesbourg are in Québec City — only shopping-centre landmark names and Trois-Rivières are meaningful leak signals"
metrics:
  duration: "~8 minutes"
  completed: "2026-06-19"
  tasks: 2
  files_created: 1
  files_modified: 1
  tests_added: 57
  tests_total_after: 458
---

# Phase 5 Plan 02: llms.txt Leak Fix + Content Depth Summary

**One-liner:** Rewrote llms.txt route to resolve all facts from tenant config — fixing the cross-tenant "Carrefour Beauport" leak, switching to canonicalUrl, adding Hours/Services/Booking/Comparison/EN-equivalents sections; backed by 57 per-tenant TDD tests.

## Tasks Completed

| Task | Type | Commit | Description |
|------|------|--------|-------------|
| 1 — RED tests | test | 04a01b2 | 57 per-tenant route tests (all failing against old route) |
| 2 — GREEN impl | feat | 1859677 | Rewrite route.ts: leak fix + canonicalUrl + full section structure |

## What Was Built

### src/app/llms.txt/route.ts (rewritten)

The route now:

1. **L-01 (LLMS-01) — Leak fix:** `site.llmsDescription` replaces the hardcoded `"Professional nail salon at Carrefour Beauport, Québec City…"` blockquote. All landmark/address/city/phone facts come from `getStoreConfig()`. A charlesbourg crawler gets Carrefour Charlesbourg; a rivieres crawler gets Centre Les Rivières.

2. **L-02 — canonicalUrl host:** `const frBase = \`${site.canonicalUrl}/fr\`` and `const enBase = \`${site.canonicalUrl}/en\``. The old bug used `site.url` (runtime-overridable).

3. **L-03/L-06 — Generated facts sections:**
   - `## Contact & Location` — address.line1+2, landmark, phone, email
   - `## Hours` — generated from `site.hours` array
   - `## Services & Pricing (CAD)` — generated from `services` array: `$60–$75 CAD`
   - `## Booking` — `frBase + site.booking` link

4. **L-04 — Phase-4 page links:**
   - `/tarifs` (FR) + `/pricing` (EN)
   - 4 FR comparison slugs: pose-vs-remplissage, manucure-vs-pedicure, gel-vs-acrylique, meilleur-pour
   - 4 EN comparison slugs: nail-extensions-vs-fill, manicure-vs-pedicure, gel-vs-acrylic, best-for
   - Borough near-me slug via `site.routes.at(-1)` (e.g. /beauport, /charlesbourg, /trois-rivieres)

5. **L-05 — FR-canonical-first, then EN equivalents:**
   - `## Key Pages (FR — canonical)` + `## Comparaisons (FR)` + `## Quartier (FR)` lead
   - `## English Equivalents` + `### Comparisons (EN)` follow

6. **Empty llmsDescription fallback:** When the field is empty (all tenants pre-05-05), derives `"{name} — salon d'ongles professionnel au {landmark}, {city}…"` from config. Build stays healthy; no dummy prose emitted.

### src/app/llms.txt/route.test.ts (57 tests, new)

Uses `mock.module("@/lib/store-config")` with a mutable closure — the same pattern as `src/app/admin/layout.test.ts`. Iterates all 3 live tenants (`ongles-maily`, `ongles-charlesbourg`, `ongles-rivieres`; `template` excluded via `EXCLUDED` set).

Per-tenant coverage (19 tests × 3 tenants = 57):
- canonicalUrl/fr and canonicalUrl/en as link bases
- site.url NOT used as link base when it differs from canonicalUrl
- site.name present in body
- No other tenant's city/landmark strings (LLMS-01 no-leak)
- `## Contact & Location` section with landmark, phone, email
- `## Hours` section
- `## Services & Pricing (CAD)` section with service ids and `$price CAD`
- `## Booking` section with booking path
- `/tarifs` and `/pricing` links
- All 4 FR comparison slugs
- All 4 EN comparison slugs
- Borough near-me slug
- `## Key Pages (FR` section
- `## Comparaisons (FR)` section
- `## English Equivalents` section
- FR sections appear before English Equivalents (ordering)
- Response Content-Type: text/plain; charset=utf-8

## Verification Results

| Check | Result |
|-------|--------|
| `bun test src/app/llms.txt/route.test.ts` | 57/57 pass |
| `bun test src/` | 458/458 pass (was 401; +57 new) |
| `bunx tsc --noEmit` (production files) | Clean — 0 errors |
| charlesbourg body contains "Carrefour Beauport" | No (leak fixed) |
| rivieres body contains "Carrefour Beauport" | No (leak fixed) |
| maily body contains "Carrefour Charlesbourg" | No (no reverse leak) |
| All links use canonicalUrl host | Yes |
| FR sections before EN Equivalents | Yes |
| Near-me slug per tenant | /beauport, /charlesbourg, /trois-rivieres |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- **`site.llmsDescription`**: All three tenant `site.ts` files have `llmsDescription: ""` (empty). Real >=200-word owner prose is authored in plan 05-05 (human-verify step). The route handles empty gracefully with a minimal derived fallback sentence. The `checkLlmsDepth()` guard (added by 05-01) remains unwired from `validateSchemaInvariants()` until 05-05 activates it — this is by design.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries. The llms.txt route is public/unauthenticated by design (AI crawler target). All facts are config-literals resolved server-side.

## Self-Check

| Item | Status |
|------|--------|
| src/app/llms.txt/route.ts | FOUND |
| src/app/llms.txt/route.test.ts | FOUND |
| 04a01b2 (RED test commit) | FOUND |
| 1859677 (GREEN impl commit) | FOUND |
| 57 tests pass | VERIFIED |
| 458 full suite pass | VERIFIED |
| tsc production clean | VERIFIED |

## Self-Check: PASSED
