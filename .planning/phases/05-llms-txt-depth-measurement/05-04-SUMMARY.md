---
phase: 05-llms-txt-depth-measurement
plan: 04
subsystem: conversion
tags: [ga4, conversion-events, cta, trust-signals, nextjs, client-island]

# Dependency graph
requires:
  - phase: 05-llms-txt-depth-measurement (plan 01)
    provides: src/lib/gtag.ts ga4Events emitters (book_online_click, call_click, contact_form_submit, directions_click)
  - phase: 05-llms-txt-depth-measurement (plan 03)
    provides: Consent Mode v2 gate — events are no-ops until consent granted (correct by design)
provides:
  - 4 M-03 conversion events wired to their real click surfaces
  - FloatingCTAButtons client island (keeps FloatingCTA a Server Component, C-01 pill intact)
  - CONV-02 above-fold trust signals (price-from anchor → pricing route + R-02-gated rating) on home + service pages
affects: [05-05 activation flips measurement guards build-blocking]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server Component renders a thin 'use client' island for onClick analytics (FloatingCTA → FloatingCTAButtons)"
    - "Conversion events call ga4Events.* directly; Consent Mode v2 gate handles denied-by-default (no per-component consent logic)"
    - "Source-tripwire tests for async Server Components (readFileSync + string invariants) — no DOM in bun:test"
    - "R-02 gate: stars rendered only when site.reviews.reviewCount > 0 (never fabricated)"

key-files:
  created:
    - src/components/FloatingCTAButtons.tsx
    - src/components/FloatingCTAButtons.test.tsx
    - src/components/DirectionsLink.tsx
    - src/components/DirectionsLink.test.tsx
    - src/app/[lang]/page.trust-signals.test.ts
    - src/app/[lang]/services/[slug]/page.trust-signals.test.ts
  modified:
    - src/components/FloatingCTA.tsx
    - src/components/ContactForm.tsx
    - src/components/ContactForm.test.tsx
    - src/components/SalonCard.tsx
    - src/app/[lang]/page.tsx
    - src/app/[lang]/services/[slug]/page.tsx

key-decisions:
  - "FloatingCTA stays an async Server Component (C-01); a thin FloatingCTAButtons 'use client' island carries the book/call onClick → ga4Events."
  - "directions_click instrumented via a reusable DirectionsLink client component used by SalonCard."
  - "Home 'from' price = Math.min over the services catalog; pricing href resolved from site.nav (key 'pricing', hrefByLocale[lang] ?? href) — no hardcoded /tarifs|/pricing slug."
  - "Trust-signal stars gated on site.reviews.reviewCount > 0 (R-02) — scaffold tenants ship reviewCount 0, so they render no rating until real Google reviews land."

patterns-established:
  - "Analytics on Server Components: extract the interactive surface into a small client island rather than converting the whole page to a Client Component."

requirements-completed: [CONV-01, CONV-02]

# Metrics
duration: ~10min executor + orchestrator close-out
completed: 2026-06-19
status: complete
---

# Phase 05 Plan 04: Conversion Events + Trust Signals Summary

**Instrumented the four M-03 conversion events on their real click surfaces and added above-the-fold price + rating trust signals to the home and service heroes — without converting any Server Component wholesale to a Client Component.**

## Performance
- **Duration:** ~10 min executor (tasks 1–2 + task-3 RED), then orchestrator close-out for task-3 GREEN + SUMMARY
- **Completed:** 2026-06-19
- **Tasks:** 3 (RED→GREEN each)

## Accomplishments
- **M-03 events (CONV-01):** `book_online_click` + `call_click` via a new `FloatingCTAButtons` client island (FloatingCTA stays a Server Component, C-01 pill preserved); `contact_form_submit` on ContactForm; `directions_click` via a reusable `DirectionsLink` client component wired into SalonCard. All call `ga4Events.*` from `src/lib/gtag.ts`; the Consent-Mode-v2 gate (plan 03) keeps them no-ops until consent.
- **CONV-02 trust signals:** above-the-fold price-from anchor (`formatFromPrice` → localized pricing route resolved from `site.nav`) and an `reviewCount > 0`-gated star rating on both the home hero and the service-detail hero.

## Task Commits
1. **FloatingCTAButtons island (RED→GREEN)** — `ef63353` → `167ad98`
2. **ContactForm submit + DirectionsLink (RED→GREEN)** — `c2098f7` → `559b76f`
3. **CONV-02 above-fold trust signals (RED→GREEN)** — `a2433c0` (RED, executor) → `308506b` (GREEN, orchestrator close-out)

_Note: the executor completed tasks 1–2 and committed task-3's RED tests, then stalled at the RED→GREEN boundary (stream idle timeout). The orchestrator finished task-3 GREEN on the main checkout (executor worktree merged first; worktree-path-guard prevents cross-worktree writes) and authored this SUMMARY (#2070 close-out)._

## Self-Check: PASSED
- Tripwire tests 6/6, full unit suite 509/509, `next build` exit 0 (JSX typechecks).
- FloatingCTA remained a Server Component; only the interactive surface is a client island.
- Star ratings gated on `reviewCount > 0` (no fabricated reviews for zero-review tenants).
- No new dependencies (dual-lockfile trap avoided).
