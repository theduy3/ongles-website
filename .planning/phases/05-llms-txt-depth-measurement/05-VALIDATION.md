---
phase: 05
slug: llms-txt-depth-measurement
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-19
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from `05-RESEARCH.md` §Validation Architecture. Per-Task map filled by the planner once PLAN task IDs exist.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (`bun test src/`) |
| **Config file** | none dedicated — `bun test` resolves `*.test.ts(x)` under `src/` |
| **Quick run command** | `bun test src/config/schema-invariants.test.ts src/app/llms.txt src/lib` |
| **Full suite command** | `bun test src/` |
| **Estimated runtime** | ~1s unit; Playwright e2e separate (`playwright test`) |

> Pre-existing baseline: ~357 unit pass. 11 Playwright failures pre-exist (not regressions — do not block on them).

---

## Sampling Rate

- **After every task commit:** `bun test src/config/schema-invariants.test.ts src/app/llms.txt src/lib` (unit only, ~5s)
- **After every plan wave:** `bun test src/` (full unit suite)
- **Before verify-work:** Full unit suite green + manual UAT (GA4 DebugView, DevTools Network, mobile CTA above-fold)
- **Max feedback latency:** ~5 seconds (unit)

---

## Per-Task Verification Map

> Task IDs (`05-NN-MM`) assigned by the planner. Rows below are requirement-level anchors the planner maps tasks onto.

| Req | Behavior | Test Type | Automated Command | File | Status |
|-----|----------|-----------|-------------------|------|--------|
| LLMS-01 | No cross-tenant city/landmark in any tenant's llms.txt body; canonicalUrl used | unit — `checkLlmsLeak()` + route test | `bun test src/config/schema-invariants.test.ts src/app/llms.txt` | ❌ W0 | ⬜ pending |
| LLMS-02 | `site.llmsDescription` present + ≥200 unique words/tenant | unit — `checkLlmsDepth()` | `bun test src/config/schema-invariants.test.ts` | ❌ W0 | ⬜ pending |
| LOCAL-01 | NAP identical across surfaces (`site.contact` ≡ `location.*`) per tenant | unit — `checkNapConsistency()` | `bun test src/config/schema-invariants.test.ts` | ❌ W0 | ⬜ pending |
| CONV-01 | FloatingCTA book/phone links render + book_online_click fires (mocked gtag) | unit/integration | `bun test src/components` | ❌ W0 | ⬜ pending |
| CONV-02 | Trust/price-from above fold on home + service; Stars gated on R-02 (≥5 fresh) | unit (gate) + manual UAT (layout) | `bun test src/config/schema-invariants.test.ts` + DevTools | ⚠️ partial | ⬜ pending |
| MEAS-01 | GA4 `<Script>` present when `ga4MeasurementId` set; `gtagEvent()` names/params correct | unit (layout render + gtag) | `bun test src/app/[lang]/layout.test.tsx src/lib/gtag.test.ts` | ❌ W0 | ⬜ pending |
| MEAS-02 | WebVitalsReporter emits gtag INP/LCP/CLS on metric fire | unit (mock `useReportWebVitals`) | `bun test src/components/WebVitalsReporter.test.tsx` | ❌ W0 | ⬜ pending |
| MEAS-01/02 | `ga4MeasurementId` field on `TenantSite` | type-check | `bunx tsc --noEmit` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky/partial*

---

## Wave 0 Requirements

- [ ] `src/config/schema-invariants.test.ts` — EXTEND: tests for `checkLlmsDepth`, `checkLlmsLeak`, `checkGA4IdPresent`, `checkNapConsistency`
- [ ] `src/app/llms.txt/route.test.ts` — NEW: per-tenant body, no hardcoded city, canonicalUrl used, ≥200 words
- [ ] `src/lib/gtag.test.ts` — NEW: `gtagEvent()` names/param shapes, consent default/update calls
- [ ] `src/components/WebVitalsReporter.test.tsx` — NEW: mocked `useReportWebVitals` → gtag emission
- [ ] `src/app/[lang]/layout.test.tsx` — NEW: GA4 Script tags present when `ga4MeasurementId` non-empty

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GA4 DebugView shows conversion events on consent accept | MEAS-01 | Requires live GA4 property + real browser session | Accept consent → click call/book/form/directions → confirm events in GA4 DebugView |
| INP P75 visible in GA4 | MEAS-02 | Real-user metric needs live property | DevTools Network → confirm `/collect` payload carries `en=INP`; GA4 events report |
| Sticky CTA above fold on mobile, persists on scroll | CONV-01 | Above-fold = viewport layout concern | DevTools mobile emulation (iPhone) → load home → CTA visible at scroll 0 + after scroll |
| Trust/price anchors above fold | CONV-02 | Visual layout judgement | DevTools mobile → home + service pages → confirm Stars/price-from in initial viewport |
| GA4 AI-Assistant + Perplexity-regex channel groups | MEAS-01 | GA4-admin console config, not code | Manual GA4 admin step (documented in plan, not a code deliverable) |
| Per-tenant `llmsDescription` prose (200+ words) authored | LLMS-02 | Hand-authored copy per tenant | Human-verify checkpoint — owner supplies copy |
| GA4 measurement IDs (`G-XXXXXXXXXX`) per tenant | MEAS-01 | Owner must create GA4 properties | Human-verify checkpoint — owner supplies IDs |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
