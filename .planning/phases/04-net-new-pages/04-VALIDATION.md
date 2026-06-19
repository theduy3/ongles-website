---
phase: 4
slug: net-new-pages
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-18
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from 04-RESEARCH.md `## Validation Architecture`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (Bun built-in runner) |
| **Config file** | none — `bun test` is zero-config; build-guard wired via `next.config.ts` |
| **Quick run command** | `bun test src/` |
| **Full suite command** | `bun test src/ && bun run build` |
| **Estimated runtime** | ~5–15s tests; `next build` adds the build-guard pass |

**Two gates, both must be green:**
1. `bun test src/` — unit/parity tests (schema-invariants, seo-parity, ItemList shape).
2. `bun run build` — the build-blocking guard in `schema-invariants.ts` (word-count ≥200/≥150, <30% cross-tenant overlap, route-presence, answerBlock ≥2 sentences). Deploy fails on shortfall (P-17, mirrors Phase 3 D-05/D-11).

---

## Sampling Rate

- **After every task commit:** `bun test src/`
- **After every plan wave:** `bun test src/ && bun run build`
- **Before `/gsd-verify-work`:** full suite + build green on all tenants
- **Max feedback latency:** ~30s

---

## Per-Task Verification Map

> Task IDs are assigned by the planner (step 8). The executor / nyquist-auditor fills this map per task. Below is the requirement-granularity validation contract the planner must decompose into per-task `<automated>` verifies.

| Requirement | Validates (success criterion) | Test Type | Automated Command / Gate | Manual? |
|-------------|-------------------------------|-----------|--------------------------|---------|
| PAGE-01 | Pricing page emits `ItemList` + per-item `AggregateOffer` from config pricing | unit + build | `bun test src/` (ItemList shape test) + `bun run build` | + Google Rich Results (manual) |
| PAGE-01 | `/tarifs` (FR) / `/pricing` (EN) reachable, no 404, in sitemap both locales | build + route | `bun run build`; sitemap-presence guard assert | route-reachability spot-check |
| PAGE-02 | 4 comparison pages ≥200 words unique + lead `<AnswerBlock>` | build guard | `bun run build` (checkWordCount ≥200, answerBlock ≥2 sentences) | — |
| PAGE-02 | comparison routes reachable + in sitemap (FR/EN) | build + route | sitemap-presence guard | route-reachability |
| PAGE-03 | near-me page ≥150 words unique opening + `<AnswerBlock>` | build guard | `bun run build` (checkWordCount ≥150) | — |
| PAGE-03 | <30% cross-tenant sentence overlap per locale | build guard | `bun run build` (Jaccard overlap guard over TENANT_REGISTRY) | — |
| PAGE-01/02/03 | FR/EN `seo.{locale}.json` parity for all new keys | unit | `bun test src/` (seo-parity.test.ts extended) | — |

*Status legend: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing bun:test infrastructure covers the framework — no installer needed. New test/guard files this phase must add (RED-first per TDD):

- [ ] `src/config/schema-invariants.ts` — new asserts: `checkWordCount` (≥200 comparison / ≥150 near-me), `checkCrossTenantOverlap` (Jaccard <30%), `checkRoutePresence` (new routes in sitemap), answerBlock ≥2-sentence non-empty. Reuse Phase 3 `splitSentences()` / `countWords()` (D-13).
- [ ] guard unit test(s) — fail-fixture proving each new assert blocks the build (mirrors Phase 3 03-05 fail-fixture proof).
- [ ] `src/config/seo/seo-parity.test.ts` — extended to cover new pricing/comparison/near-me + answerHeading/answerBlock keys.
- [ ] pricing `ItemList` shape test — asserts `servicesGraph()` output has `@type: ItemList` with per-item `AggregateOffer` lowPrice/highPrice.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ItemList + AggregateOffer valid in Google Rich Results | PAGE-01 | External Google tool; offline guard can't certify Google acceptance | Paste rendered `/tarifs` (one tenant) into Google Rich Results Test; expect ItemList + Service/AggregateOffer, no errors |
| Route reachability FR + EN | PAGE-01/02/03 | Requires running server / built output | `bun run build` then curl/visit each new route on FR and EN — expect 200, no redirect |
| AI-citation pickup (downstream) | phase goal | Depends on indexing latency; not deterministic | Spot-check ChatGPT/Perplexity for "[salon] tarifs/pricing [city]" after indexing (carry-forward like Phase 3 SC-4) |

---

## Validation Sign-Off

- [ ] Every planned task has `<automated>` verify OR a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all new guard/test files above
- [ ] No watch-mode flags in commands
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter (after planner maps every task)

**Approval:** pending
