---
phase: 01-per-tenant-config-completion
plan: 2
type: execute
status: complete
completed: 2026-06-17
requirements: [CONFIG-01, CONFIG-02]
---

# Plan 01-2 Summary — Secondary-Tenant Config Completion

## Outcome

Both secondary tenants (`ongles-charlesbourg`, `ongles-rivieres`) have owner-confirmed
required-core config; all TODO markers cleared; the Wave 1 build guard was found broken
during verification and repaired. Phase 1 gate is now real: an incomplete tenant config
aborts `next build`.

## Owner confirmation (checkpoint resolution)

Plan 01-2 is `autonomous: false` — it gated on `01-DATA-CHECKLIST.md`. The owner reviewed
the checklist and **confirmed all current values as real/final** (2026-06-17):

- storeId `"OC"` / `"OR"` are the real SalonX store codes
- `info@onglescharlesbourg.com` / `info@onglesrivieres.com` are real contact emails
- current geo coords accepted as final
- per-service prices (shared with maily) intentionally apply — owner override of D-04's
  "distinct pricing" preference
- Google Maps CID: **"no GBP yet"** for both → deferred-OK (D-07); `socialProfiles: []`

Recorded in `01-DATA-CHECKLIST.md` (commit `1c31871`).

## Tasks / commits

| Task | Commit | Note |
|------|--------|------|
| Record owner confirmation in DATA-CHECKLIST | `1c31871` | artifact #1 (source of truth) |
| Clear all 14 TODO markers in secondary-tenant configs | `6d755a0` | CONFIG-02 / truth #2 |
| **Fix broken Wave 1 build guard** (dynamic→static import) | `bbc5718` | repairs 01-1 deliverable; see below |

## Critical finding — Wave 1 build guard was broken

Wave 1 (Plan 01-1) wired the guard into `next.config.ts` as a **dynamic**
`await import("./src/config/config-completeness")`. Wave 1's SUMMARY claimed `next build`
succeeds through the guard — **this was never actually run; it was false.**

Ground truth (real `npm run build`): **every** build failed with
`Cannot find module './src/config/config-completeness'`. Next 16 SWC-transforms
`next.config.ts` to a compiled CJS file and only registers its `.ts`/`.tsx` require-hook
when the compiled output contains `require(`. A dynamic `import()` is preserved as native
ESM and bypasses the hook → MODULE_NOT_FOUND on **all** builds, breaking the Dokploy deploy
unconditionally (commit `3b29887` was on `main`).

**Fix (`bbc5718`):** static top-level import → compiles to `require(` → hook fires →
resolves the full `.ts` chain (`config-completeness.ts` → `index.ts` → tenant dirs).
Validation still runs only under `PHASE_PRODUCTION_BUILD`, so `next dev` stays unblocked.

## Must-haves verification

| Truth | Status | Evidence |
|-------|--------|----------|
| #1 real/no-placeholder values | ✅ | owner-confirmed (current values blessed as real) |
| #2 all 15+ TODOs cleared | ✅ | 14 markers removed (`6d755a0`); grep clean |
| #3 NAP + hours self-consistent (hours[] FR ↔ hoursSpec[] 24h) | ✅ | verified both tenants |
| #4 validateAllTenants() == [] (test GREEN) | ✅ | `bun test src/` → 151 pass / 0 fail |
| #5 clean PHASE_PRODUCTION_BUILD build succeeds; blanked field aborts | ✅ | clean build exit 0; blanked `geo.lat` → exit 1 with validator error; restored |
| #6 Maps CID real-or-deferred, no empty-string/placeholder linkage | ✅ (hard clause) | `socialProfiles: []` both; no fake CID |

## Deviations / deferrals

- **Truth #6 omission nicety deferred to Phase 2.** `src/lib/seo.ts:230` emits
  `sameAs: cfg.site.socialProfiles` unconditionally → `sameAs: []` for deferred tenants.
  The hard clause (no empty-string/placeholder linkage) is met. Clean *omission*
  (drop `sameAs` when empty) touches `seo.ts`, which is **not** in Plan 01-2's
  `files_modified` and is Phase 2 schema scope (SCHEMA-*). `sameAs: []` is benign
  (crawlers ignore it; no manual-action risk). → Phase 2 follow-up.
- **D-04 pricing** intentionally shared with maily per explicit owner override.
- The Wave 2 executor agent halted mid-task on the guard import problem without
  completing or writing this SUMMARY; the orchestrator finished verification, the
  guard fix, and this document.

## Process note (Wave 1 reliability)

Plan 01-1's SUMMARY asserted build-guard verification that was never executed. Lesson:
build-guard truths must be proven with an actual `next build` (both pass and forced-fail),
not asserted. Logged for `tasks/lessons.md`.
