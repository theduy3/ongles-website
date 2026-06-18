---
status: complete
phase: 01-per-tenant-config-completion
source: [01-1-SUMMARY.md, 01-2-SUMMARY.md]
started: 2026-06-17
updated: 2026-06-17
verdict: PASS (5/5)
note: >
  Phase 1 is an infrastructure/config gate, not a user-flow feature. ROADMAP marks
  it Mode:mvp but the goal is a build gate, not a User Story — UAT is driven from
  the SUMMARY truths. Most truths are machine-verified (evidence inline); the one
  user-facing test is the live Dokploy deploy, which only the owner can see.
---

## Current Test

ALL TESTS COMPLETE — verdict PASS (5/5). No gaps.

## Tests

### 1. Live production deploy — cold-start build gate
expected: Dokploy build on commit 63196c4 completes green; new build serves. (Cold-start smoke: next.config.ts changed.)
result: PASS — Dokploy "Done" (green) on commit 63196c4, confirmed by owner. Production next build ran the guard, passed on complete config, deployed. Old MODULE_NOT_FOUND is gone.

### 2. Build gate REJECTS incomplete config
expected: A production build with any required-core field blank/zero/placeholder aborts non-zero with a clear validator error naming the tenant + field.
result: PASS — local `next build` with charlesbourg `geo.lat`→0 aborted exit 1: "Config completeness check FAILED — Tenant ongles-charlesbourg ... [site.geo.lat] must be real coordinates"; field restored.

### 3. Build gate PASSES on complete config
expected: A clean production build succeeds; `next dev` is never blocked.
result: PASS — local clean `next build` exit 0; dev unaffected (validation only fires under PHASE_PRODUCTION_BUILD).

### 4. Both secondary tenants have complete, consistent data
expected: charlesbourg + rivieres have real (owner-confirmed) storeId, geo, email, prices; hours[] FR ↔ hoursSpec[] 24h consistent; no leftover TODO markers.
result: PASS — owner confirmed values 2026-06-17; 14 TODO markers cleared (6d755a0); hours/hoursSpec verified consistent both tenants; validateAllTenants() == [].

### 5. Validator covers all tenants, excludes template; full suite green
expected: validator iterates TENANT_REGISTRY, skips template; no regressions.
result: PASS — `bun test src/` 151 pass / 0 fail.

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0

## Gaps

- Truth #6 omission nicety (seo.ts emits `sameAs: []` for deferred-CID tenants) — deferred to Phase 2 (schema scope, not in 01-2 files; benign, crawlers ignore empty arrays). Not a Phase 1 gap.
