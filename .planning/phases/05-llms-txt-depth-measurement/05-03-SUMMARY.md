---
phase: 05-llms-txt-depth-measurement
plan: 03
subsystem: measurement
tags: [ga4, consent-mode-v2, web-vitals, nextjs, law-25, analytics]

# Dependency graph
requires:
  - phase: 05-llms-txt-depth-measurement (plan 01)
    provides: TenantSite.ga4MeasurementId field + src/lib/gtag.ts pure event helper
provides:
  - GA4 hand-rolled via next/script, rendered only when a measurement ID is configured
  - Consent Mode v2 denied-by-default init (Quebec Law 25 compliant)
  - ConsentBanner client island (localStorage-persisted grant/decline)
  - WebVitalsReporter client island reporting INP/LCP/CLS/TTFB/FCP to GA4 via next/web-vitals
  - consent dict keys in both runtime (content.*.json) and type (dictionaries/*.json) sources
affects: [05-04 conversion events reuse gtag + consent gate, 05-05 activation supplies real GA4 IDs]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GA4 hand-rolled with next/script (no external analytics dep)"
    - "Next built-in next/web-vitals (NOT external web-vitals pkg — avoids dual-lockfile drift)"
    - "Consent Mode v2 denied-by-default with wait_for_update:500 before gtag.js"
    - "Dual-source dict key: consent added to content.*.json (runtime) AND dictionaries/*.json (type)"

key-files:
  created:
    - src/components/ConsentBanner.tsx
    - src/components/ConsentBanner.test.tsx
    - src/components/WebVitalsReporter.tsx
    - src/components/WebVitalsReporter.test.tsx
    - src/lib/ga4-scripts.ts
  modified:
    - src/app/[lang]/layout.tsx
    - src/app/[lang]/layout.test.tsx
    - src/config/base/content.fr.json
    - src/config/base/content.en.json
    - src/dictionaries/fr.json
    - src/dictionaries/en.json

key-decisions:
  - "GA4 <Script> renders only when shouldInjectGA4(measurementId) is true; empty placeholder ID = no script, no runtime error, build green (presence guard stays unwired until 05-05)."
  - "analytics_storage denied-by-default, ad_storage denied always (no advertising cookies); consent only granted via ConsentBanner accept."
  - "Web Vitals via next/web-vitals built-in; external web-vitals npm package deliberately NOT added."
  - "consent dict block added to BOTH content.*.json (runtime value) and dictionaries/*.json (type via typeof en) to satisfy both layers."

patterns-established:
  - "Client-island analytics: layout (Server Component) mounts 'use client' ConsentBanner + WebVitalsReporter islands; server/client boundary preserved."
  - "Pure exported helpers (getStoredConsent, buildConsentUpdate, shouldInjectGA4, buildConsentInitScript) unit-tested without a DOM renderer."

requirements-completed: [MEAS-01, MEAS-02]

# Metrics
duration: ~10min
completed: 2026-06-19
status: complete
---

# Phase 05 Plan 03: GA4 + Consent Mode v2 + Web Vitals Summary

**Stood up the measurement layer — GA4 (none existed before) wired through next/script with Quebec-Law-25 denied-by-default consent and a real-user Core Web Vitals reporter, all gated so an empty measurement ID keeps the build green.**

## Performance

- **Duration:** ~10 min (executor stalled at SUMMARY write; implementation complete and verified)
- **Completed:** 2026-06-19
- **Tasks:** 3 (4 TDD commits)
- **Files modified:** 11 (5 created, 6 modified)

## Accomplishments
- GA4 hand-rolled via `next/script`: a `beforeInteractive` consent-init inline script (Consent Mode v2, denied-by-default, `wait_for_update: 500`) + an `afterInteractive` gtag.js loader, both rendered only when `shouldInjectGA4(site.ga4MeasurementId)` is true.
- `ConsentBanner` client island — surfaces on first visit, persists choice to `localStorage` (`ga4_consent`), fires `gtag('consent','update',…)` to grant analytics_storage on accept; ad_storage stays denied always.
- `WebVitalsReporter` client island — `useReportWebVitals` from `next/web-vitals` reports INP/LCP/CLS (+ TTFB/FCP) to the per-tenant GA4 property; no-op while consent denied.
- `consent` dict block added to both runtime (`content.fr/en.json`) and type (`dictionaries/fr/en.json`) sources with identical keys, preserving locale parity.

## Task Commits

1. **WebVitalsReporter (RED→GREEN)** — `7806cba` (test) → `49a8f03` (feat)
2. **ConsentBanner + GA4 layout guard (RED→GREEN)** — `68e7d99` (test) → `feccff4` (feat)

_Note: SUMMARY authored by the execute-phase orchestrator after the executor stalled at the final SUMMARY-write step (#2070 close-out). All implementation commits landed and were independently verified: 432/432 tests in-worktree, 489/489 post-merge, build exit 0._

## Files Created/Modified
- `src/components/ConsentBanner.tsx` — Consent Mode v2 client island (grant/decline, localStorage persistence)
- `src/components/WebVitalsReporter.tsx` — CWV→GA4 reporter island via next/web-vitals
- `src/lib/ga4-scripts.ts` — pure helpers `shouldInjectGA4()` + `buildConsentInitScript()` (testable without DOM)
- `src/app/[lang]/layout.tsx` — conditional GA4 + consent init Scripts, mounts both islands
- `src/config/base/content.{fr,en}.json` — consent banner copy (runtime source)
- `src/dictionaries/{fr,en}.json` — consent key (type source)

## Self-Check: PASSED
- TDD RED→GREEN honored per task (test commit precedes feat commit).
- Empty `ga4MeasurementId` placeholder → no GA4 script, build green (verified, BUILD_EXIT=0).
- Locale parity: consent keys present and identical in fr/en across both content and dictionary files.
- No external `web-vitals` dependency added (dual-lockfile trap avoided).
