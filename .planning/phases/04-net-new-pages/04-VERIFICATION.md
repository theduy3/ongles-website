---
status: human_needed
phase: 04-net-new-pages
goal: "Pricing, comparison, and near-me pages exist per tenant with structured schema and unique copy, covering high-intent search and AI-citation patterns not served by existing routes"
requirements: [PAGE-01, PAGE-02, PAGE-03]
verified_by: orchestrator (verifier subagent truncated; goal-backward completed inline)
date: 2026-06-19
automated_gate: "bun run build green; bun run test 355 pass / 0 fail"
---

# Phase 04 — Goal Verification (Net-New Pages)

**Verdict:** Goal achieved in code; **all automated must-haves pass**. Phase is held
`human_needed` pending the manual UAT gates in `04-UAT.md` (visual render, Google Rich
Results, locale-404 spot-checks, and one design decision). Method: goal-backward against
the actual codebase — the verifier subagent truncated before writing, so the orchestrator
(which executed and gate-verified every wave) completed the assessment inline.

## Requirement traceability — every phase req ID accounted for

| Req | Status | Evidence |
|-----|--------|----------|
| PAGE-01 | ✅ met | `/[lang]/tarifs` (FR) + `/[lang]/pricing` (EN) build as dynamic routes for all tenants; `pricingGraph()` (src/lib/seo.ts) emits `ItemList` (seo.ts:331) whose offers route through `offer()` → `AggregateOffer` with lowPrice/highPrice (seo.ts:160). Answer-first (AnswerBlock carries the single h1). |
| PAGE-02 | ✅ met | 4 comparison/decision pages reachable FR `/comparaisons/[slug]` + EN `/comparisons/[slug]` (pose-vs-remplissage, manucure-vs-pedicure, gel-vs-acrylique, meilleur-pour); each renders an answer block (`answerHeading`/`answerBlock`) + ≥200-word `body`, enforced by `checkWordCount` comparison branch (≥200) + `checkComparisonAnswerBlockPresence`. See deviation below. |
| PAGE-03 | ✅ met | 3 borough near-me pages reachable FR+EN (beauport/charlesbourg/trois-rivieres); each ≥150-word answer block; **pairwise cross-tenant Jaccard overlap 0.000 (<0.30 floor)** per 04-03; `checkCrossTenantOverlap` + `checkWordCount` (nearMe ≥150) wired. |

## Must-haves checked against the real codebase

1. **Structured schema** — `pricingGraph` ItemList+AggregateOffer (PAGE-01); breadcrumb JSON-LD on comparison + near-me pages; Phase-2 Organization/Service graphs intact.
2. **Unique copy / no cross-tenant duplication** — `checkCrossTenantOverlap()` is wired into `validateSchemaInvariants()` (schema-invariants.ts:827) and green; near-me bodies measured at 0.000 overlap.
3. **Build-time guards actually run over authored content (not just declared):** `validateSchemaInvariants()` calls `checkWordCount` (826), `checkCrossTenantOverlap` (827), `checkRoutePresence` (831), plus answer-block presence checks — all green across all 3 tenants × 2 locales.
4. **Route presence / sitemap** — all 7 new routes covered: pricing + 4 comparison pairs via `localizedPageEntries` (locale-distinct slugs, hreflang FR/EN/x-default); borough pages via standard `pageEntries` route iteration (same slug both locales, in `site.routes`). `checkRoutePresence` asserts borough slugs present and is green.
5. **FR/EN key parity** — `seo-parity.test.ts` green across all new `pages.{pricing,comparison,nearMe}` keys for every tenant.

## PAGE-02 deviation verdict — ComparisonColumns not wired (NOT a gap)
`ComparisonColumns.tsx` (two-column card layout, UI-SPEC §B) is authored but intentionally
not rendered: `pages.comparison` carries answer-first prose only (`answerHeading`/`answerBlock`/
`body`), no per-side `{name,descriptor,bullets}` content, and only 2 of 4 comparisons map to
two distinct services (`gel-vs-acrylique` = one service/two materials; `meilleur-pour` = three
services). **PAGE-02's requirement is "comparison/decision pages exist … with answer blocks"** —
the answer-first ≥200-word pages satisfy it. The two-column cards are a presentation enhancement,
not a requirement. Recorded as an explicit human-decision item in `04-UAT.md` (decide before
phase close whether columns are wanted; wiring them needs per-side content authored in seo JSON).

## Code-review findings (04-REVIEW.md)
3 critical findings fixed (commit 81722d9): CR-01 wrong FR street address NAP for charlesbourg +
rivieres (pre-existing, surfaced here); CR-02 unmapped-id crash guard on comparison pages;
CR-03 `Service.priceTo` type made optional to match consumers. 5 warnings / 3 info (dead code,
missing null guards, hardcoded i18n strings in NearMeDetails) deferred to UAT / Phase 6
cross-tenant audit — non-blocking.

## Remaining for human (held `human_needed`)
The automated layer cannot self-verify these — see `04-UAT.md` for the full manifest:
1. Visual render of each new page (FR + EN) per tenant — answer-first layout, gold prices, mobile no-scroll.
2. Google Rich Results Test on a pricing page (ItemList + AggregateOffer) and a comparison page.
3. Locale-guard 404 spot-checks (`/en/tarifs`, `/fr/pricing`, wrong-locale comparison slugs → 404).
4. Decision: are two-column comparison cards required before phase close? (PAGE-02 deviation above.)
5. AI-citation carry-forward check (ChatGPT/Perplexity citing answer blocks) — deferred, long-horizon.

**Next:** run `/gsd-verify-work 4` to walk the UAT items; phase auto-completes when UAT passes.
