---
phase: 05-llms-txt-depth-measurement
plan: "01"
subsystem: config-types-analytics-foundation
status: complete
tags: [tdd, ga4, llms-txt, schema-invariants, type-system]
dependency_graph:
  requires: []
  provides:
    - TenantSite.ga4MeasurementId field (consumed by 05-02, 05-03)
    - TenantSite.llmsDescription field (consumed by 05-02)
    - checkLlmsDepth() guard (wired in 05-05)
    - checkLlmsLeak() guard (wired in 05-05)
    - checkGA4IdPresent() guard (wired in 05-05)
    - checkNapConsistency() guard (wired in 05-05)
    - gtagEvent() + ga4Events (consumed by 05-03, 05-04)
  affects:
    - src/config/types.ts
    - src/config/tenants/*/site.ts (4 files)
    - src/config/schema-invariants.ts
    - src/config/schema-invariants.test.ts
    - src/lib/gtag.ts (new)
    - src/lib/gtag.test.ts (new)
tech_stack:
  added: []
  patterns:
    - alias-free guard pattern (existing, extended)
    - optional-chaining no-op for browser globals
    - unwired-until-activation guard pattern (mirrors 03/04 precedent)
key_files:
  created:
    - src/lib/gtag.ts
    - src/lib/gtag.test.ts
  modified:
    - src/config/types.ts
    - src/config/tenants/ongles-maily/site.ts
    - src/config/tenants/ongles-charlesbourg/site.ts
    - src/config/tenants/ongles-rivieres/site.ts
    - src/config/tenants/template/site.ts
    - src/config/schema-invariants.ts
    - src/config/schema-invariants.test.ts
decisions:
  - "ga4MeasurementId and llmsDescription are REQUIRED (non-optional) on TenantSite — compiler enforces population across all tenants, placeholder empty strings are valid until 05-05"
  - "Neither new field is added to SiteSectionSchema — mirrors canonicalUrl I-01 exclusion, preventing remote content injection via Supabase admin override"
  - "Four guards (checkLlmsDepth, checkLlmsLeak, checkGA4IdPresent, checkNapConsistency) are exported but UNWIRED from validateSchemaInvariants — build stays green until 05-05 wires them once owner content lands"
  - "checkGA4IdPresent is warning-class (fires for empty IDs) not hard-fail, consistent with its deferred-activation design"
  - "gtagEvent uses window.gtag?.() optional chaining — SSR-safe, bun:test-importable, no DOM bootstrap needed"
  - "ga4Events.bookOnlineClick uses event_category='conversion', others use 'engagement' per M-04 primary-key-event distinction"
metrics:
  duration: "11 minutes"
  completed: "2026-06-19"
  tasks_completed: 3
  tasks_total: 3
  files_created: 2
  files_modified: 7
---

# Phase 05 Plan 01: TenantSite Fields, gtag Helper, and Schema Guards Summary

**One-liner:** Adds `ga4MeasurementId` + `llmsDescription` to TenantSite, creates the pure `gtag.ts` GA4 event helper with four M-03 emitters, and exports four UNWIRED schema-invariant guards (checkLlmsDepth, checkLlmsLeak, checkGA4IdPresent, checkNapConsistency) as the typed, tested foundation for all Phase-5 parallel slices.

## What Was Built

### Task 1: TenantSite fields + placeholder population (commit f5c0341)

Added two REQUIRED fields to the `TenantSite` type in `src/config/types.ts`:

- `ga4MeasurementId: string` — GA4 property measurement ID per tenant; empty = no analytics; warning-level guard fires in 05-05
- `llmsDescription: string` — hand-authored AI-discovery intro for llms.txt; must be ≥200 unique words; guarded by checkLlmsDepth + checkLlmsLeak in 05-05

Populated both fields with empty string placeholders across all four tenant site.ts files (ongles-maily, ongles-charlesbourg, ongles-rivieres, template). Real G-XXXXXXXXXX IDs and ≥200-word prose are authored in the 05-05 human-verify step.

Neither field is added to `SiteSectionSchema` — mirrors the canonicalUrl I-01 exclusion so remote content injection via Supabase admin is impossible.

### Task 2: gtag.ts pure GA4 event helper (commits 8837251 RED, 383acbe GREEN)

Created `src/lib/gtag.ts` as a pure browser analytics helper:

- `gtagEvent(name, params?)` — calls `window.gtag?.('event', name, params)` with optional-chaining no-op; SSR-safe and bun:test-importable
- Global `Window.gtag?` + `Window.dataLayer?` augmentation (no DOM lib import)
- `ga4Events` const with four M-03 emitters:
  - `bookOnlineClick(location)` → `book_online_click` (event_category: 'conversion' — M-04 primary key event)
  - `callClick(phone)` → `call_click` (engagement)
  - `contactFormSubmit()` → `contact_form_submit` (engagement)
  - `directionsClick(location)` → `directions_click` (engagement)

17 tests in `src/lib/gtag.test.ts` pass (all GREEN — pure logic, no owner data).

### Task 3: Four schema-invariant guards UNWIRED (commits bd21aca RED, 48a8166 GREEN)

Added four exported, alias-free functions to `src/config/schema-invariants.ts`, placed before `validateSchemaInvariants()` and intentionally NOT wired into it:

- `checkLlmsDepth()` — LLMS-02: fires when `llmsDescription` < 200 words; RED for all live tenants (empty placeholders); excludes template
- `checkLlmsLeak()` — LLMS-01: detects another tenant's city/landmark in any tenant's description (returns [] when descriptions are empty)
- `checkGA4IdPresent()` — MEAS-01: fires when `ga4MeasurementId` is empty; warning-class; RED for all live tenants
- `checkNapConsistency()` — NAP-01: asserts site.contact phone/street/city/postalCode and hours block count match cfg.location; GREEN for all current tenants

All four use only relative imports, `countWords()`, `err()`, `EXCLUDED_TENANTS`, and `TENANT_REGISTRY` (already imported) — alias-free per module constraints.

165 schema-invariants tests pass. 401 full unit tests pass (no regressions). `validateSchemaInvariants()` returns [] (build gate stays green).

## Verification Results

| Check | Result |
|-------|--------|
| `bunx tsc --noEmit` | Clean (no new errors) |
| `bun test src/lib/gtag.test.ts` | 17/17 pass |
| `bun test src/config/schema-invariants.test.ts` | 165/165 pass |
| `bun test src/` (full suite) | 401/401 pass |
| `validateSchemaInvariants()` returns [] | Confirmed |
| Four new guards NOT in validateSchemaInvariants body | Confirmed |
| Neither new field in SiteSectionSchema | Confirmed |

## Deviations from Plan

None — plan executed exactly as written.

**Note on tsc cast (auto-fixed Rule 1):** Initial `(cfg.site.hours as unknown[]).length` cast produced TS2352 errors because `site.hours` is `readonly`. Fixed inline by using `cfg.site.hours.length` directly (readonly arrays have `.length`). This was a one-line fix during GREEN implementation, not a deviation from plan intent.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries introduced in this plan. The two new `TenantSite` fields are config-literals excluded from the Supabase override surface (`SiteSectionSchema`) as required by T-05-02. `gtag.ts` only emits event names/params client-side, gated by Consent Mode v2 implemented in 05-03 (T-05-03 accepted).

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `ga4MeasurementId: ""` | All tenant site.ts files | Real G-XXXXXXXXXX IDs collected from owner in 05-05 human-verify step |
| `llmsDescription: ""` | All tenant site.ts files | Real ≥200-word per-tenant prose authored in 05-05 |

Both stubs are intentional and documented. Plans 05-02 through 05-04 use these fields in routing logic that degrades gracefully when empty. Plan 05-05 wires the guards and populates real values.

## Self-Check: PASSED

All 9 created/modified files present on disk. All 5 task commits confirmed in git log.

| Item | Status |
|------|--------|
| src/config/types.ts | FOUND |
| src/config/tenants/ongles-maily/site.ts | FOUND |
| src/config/tenants/ongles-charlesbourg/site.ts | FOUND |
| src/config/tenants/ongles-rivieres/site.ts | FOUND |
| src/config/tenants/template/site.ts | FOUND |
| src/config/schema-invariants.ts | FOUND |
| src/config/schema-invariants.test.ts | FOUND |
| src/lib/gtag.ts | FOUND |
| src/lib/gtag.test.ts | FOUND |
| f5c0341 (Task 1: TenantSite fields) | FOUND |
| 8837251 (Task 2: gtag RED tests) | FOUND |
| 383acbe (Task 2: gtag GREEN impl) | FOUND |
| bd21aca (Task 3: guard RED tests) | FOUND |
| 48a8166 (Task 3: guard GREEN impl) | FOUND |
