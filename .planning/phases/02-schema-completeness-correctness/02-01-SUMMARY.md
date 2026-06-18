---
phase: 02-schema-completeness-correctness
plan: "01"
subsystem: review-data-suppression
tags: [schema, reviews, per-tenant, r02-gate, tdd]
dependency_graph:
  requires: []
  provides: [ReviewData type, per-tenant google-reviews.json, R-02 gate in organizationGraph]
  affects: [src/lib/reviews.ts, src/lib/seo.ts, src/config/types.ts, scripts/fetch-google-reviews.mjs]
tech_stack:
  added: []
  patterns: [per-tenant static JSON import, SeoConfig dependency injection for testing]
key_files:
  created:
    - src/config/tenants/ongles-maily/google-reviews.json
    - src/config/tenants/ongles-charlesbourg/google-reviews.json
    - src/config/tenants/ongles-rivieres/google-reviews.json
    - src/config/tenants/template/google-reviews.json
    - src/lib/reviews-r02-gate.test.ts
  modified:
    - src/config/types.ts
    - src/config/tenants/ongles-maily/index.ts
    - src/config/tenants/ongles-charlesbourg/index.ts
    - src/config/tenants/ongles-rivieres/index.ts
    - src/config/tenants/template/index.ts
    - src/lib/reviews.ts
    - src/lib/seo.ts
    - scripts/fetch-google-reviews.mjs
decisions:
  - "ReviewData type in types.ts uses readonly unknown[] for reviews to avoid circular dep with reviews.ts"
  - "SeoConfig gains optional reviewData field for DI in tests (avoids process.env manipulation)"
  - "R-02 gate uses IIFE in organizationGraph spread to keep cfg.reviewData override clean"
  - "src/data/google-reviews.json not deleted yet — cleanup deferred to plan 02-03 per plan action"
metrics:
  duration_seconds: 413
  completed_date: "2026-06-18"
  tasks_completed: 3
  files_changed: 13
---

# Phase 02 Plan 01: Review Data Suppression Summary

**One-liner:** Per-tenant `ReviewData` type + `google-reviews.json` stubs + R-02 gate (`fetchedAt !== null && reviewCount >= 5`) in `organizationGraph`, eliminating cross-tenant review bleed.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Add per-tenant ReviewData type + stubs + wire into TenantConfig | `40fb1c9` | types.ts, 4x google-reviews.json, 4x tenant index.ts |
| 2 RED | R-02 gate behavior tests (failing) | `af12fea` | reviews-r02-gate.test.ts |
| 2 GREEN | Rewrite reviews.ts per-tenant + R-02 gate in seo.ts | `ce8ca0c` | reviews.ts, seo.ts, reviews-r02-gate.test.ts |
| 3 | Make fetch:reviews tenant-aware | `6736e8b` | fetch-google-reviews.mjs |

## Verification Results

```
CHECK 1 PASS: reviewData present on all tenants
CHECK 2 PASS: R-02 gate correct: aggregateRating present=false
CHECK 3 PASS: fetch script tenant-aware
157 pass / 0 fail (baseline was 151; +6 new R-02 gate tests)
tsc: no new errors (pre-existing bun:test type errors excluded)
```

## What Was Built

### Task 1 — ReviewData type + stubs

Added `ReviewData` type to `src/config/types.ts`:
```typescript
export type ReviewData = {
  fetchedAt: string | null;
  aggregate: { ratingValue: number; reviewCount: number };
  reviews: readonly unknown[];
};
```

Added `reviewData: ReviewData` as a required field on `TenantConfig`. Created identical stub `google-reviews.json` files (`fetchedAt: null`, zero counts) for all four tenants. Each tenant `index.ts` now imports and re-exports `reviewData` via static `import reviewData from "./google-reviews.json"`.

### Task 2 — reviews.ts rewrite + R-02 gate (TDD)

`src/lib/reviews.ts` now imports from `tenant.reviewData` (via `@/config` singleton) instead of the global `@/data/google-reviews.json`. Exports `reviews`, `aggregate`, and `reviewsFetchedAt` from the per-tenant data.

`src/lib/seo.ts organizationGraph` now applies the R-02 gate:
```typescript
const rd = cfg.reviewData ?? { fetchedAt: reviewsFetchedAt, aggregate };
const hasRealRating = rd.fetchedAt !== null && rd.aggregate.reviewCount >= 5;
```
- `cfg.reviewData` path: used in tests (DI, no process.env manipulation needed)
- Fallback to module-level singleton: production path
- `bestRating` still comes from `cfg.site.reviews.bestRating` (static config, correct)

`SeoConfig` type gains optional `reviewData` field for test isolation.

6 behavior tests in `reviews-r02-gate.test.ts` cover: stub suppression, low count boundary (4), zero count, boundary at exactly 5, correct values from `aggregate` (not `site.reviews`), fetchedAt-null regression guard.

### Task 3 — tenant-aware fetch script

`scripts/fetch-google-reviews.mjs` now:
- Reads `const tenantId = process.env.TENANT ?? "ongles-maily"`
- Logs `[reviews] writing to tenant: ${tenantId}` on startup (pitfall-6 visibility)
- Writes to `src/config/tenants/${tenantId}/google-reviews.json`

## TDD Gate Compliance

- RED gate commit: `af12fea` — `test(02-01): RED — R-02 gate behavior tests`
- GREEN gate commit: `ce8ca0c` — `feat(02-01): rewrite reviews.ts per-tenant + R-02 gate`

Both gates present and sequenced correctly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test stub types didn't match full TenantSite/Location shape**
- **Found during:** Task 2 GREEN — `bunx tsc --noEmit` revealed missing required fields (`line1`, `line2`, `source`, `storeId`, etc.)
- **Fix:** Switched test stubs from hand-rolled minimal objects to `{ ...staticSite }` spread (same pattern as `seo.test.ts`), adding only the fields under test. Used `Record<string, unknown>` cast to access dynamic `aggregateRating` key on the business node.
- **Files modified:** `src/lib/reviews-r02-gate.test.ts`
- **Commit:** `ce8ca0c` (consolidated with GREEN implementation)

None of the plan's specified actions were deviated from. `src/data/google-reviews.json` was NOT deleted (plan explicitly deferred this to 02-03).

## Known Stubs

All four `google-reviews.json` files have `fetchedAt: null` and zero counts. This is intentional — the stubs are the initial state; running `TENANT=<id> bun run fetch:reviews` populates them with real data. The R-02 gate correctly suppresses `AggregateRating` for all tenants until a genuine fetch occurs.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries beyond those declared in the plan's threat model.

| Threat | Status |
|--------|--------|
| T-02-01 (stub rating disclosure) | Mitigated — R-02 gate suppresses aggregateRating for fetchedAt:null and reviewCount<5 |
| T-02-02 (cross-tenant review bleed) | Mitigated — per-tenant JSON files + tenant-aware fetch script |
| T-02-03 (XSS via JSON-LD) | Accepted per plan — no change |
| T-02-SC (package installs) | N/A — no package installs in this plan |

## Self-Check: PASSED

All created files exist on disk. All task commits found in git log.

| Item | Status |
|------|--------|
| src/config/tenants/ongles-maily/google-reviews.json | FOUND |
| src/config/tenants/ongles-charlesbourg/google-reviews.json | FOUND |
| src/config/tenants/ongles-rivieres/google-reviews.json | FOUND |
| src/config/tenants/template/google-reviews.json | FOUND |
| src/lib/reviews-r02-gate.test.ts | FOUND |
| commit 40fb1c9 (Task 1) | FOUND |
| commit af12fea (Task 2 RED) | FOUND |
| commit ce8ca0c (Task 2 GREEN) | FOUND |
| commit 6736e8b (Task 3) | FOUND |
