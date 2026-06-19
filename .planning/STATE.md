---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 3
status: phase-3-complete
stopped_at: Phase 3 complete (5/5 plans; D-05/D-11 guards live; pushed 2f77d85 → Dokploy deploy; SC-4 AI-citation spot-check pending indexing)
last_updated: "2026-06-19T05:00:00.000Z"
progress:
  total_phases: 6
  completed_phases: 3
  total_plans: 11
  completed_plans: 11
  percent: 50
---

# Project State — ongles-website AI-Search Optimization

**Last updated:** 2026-06-17
**Milestone:** AI-Search Optimization (SEO + GEO)

---

## Project Reference

**Core Value:** Each tenant's pages are factual, structured, and trust-heavy enough that both humans and AI answer engines can extract the salon's services, pricing, location, and booking path — and act on them.

**Current Focus:** Phase 1 — Per-Tenant Config Completion (gate)

**Tenants in scope:** ongles-maily, ongles-charlesbourg (+ others added to TENANT_REGISTRY)

**Locales:** FR (default) + EN; ES planned (deferred to v2)

---

## Current Position

| Field | Value |
|-------|-------|
| Phase | 3 |
| Phase name | Content Depth |
| Plan | 5 of 5 complete (03-01 RED foundation; 03-02 shared runtime; 03-03 FAQ depth; 03-04 answer blocks; 03-05 gate activation + UAT) |
| Status | Complete — 282 tests pass, build green with D-05/D-11 guards live & build-blocking. Pushed 2f77d85 → Dokploy deploy. Pending: SC-4 ChatGPT/Perplexity AI-citation spot-check (post-indexing, per 03-UAT.md) |
| Progress | 3/6 phases complete |

```
Progress: [#####     ] 50%
Phase 1: [##########] Complete (UAT 5/5; deployed)
Phase 2: [##########] Complete (4/4 plans; UAT verified live)
Phase 3: [##########] Complete (5/5 plans; guards live; deployed; SC-4 spot-check pending)
Phase 4: [          ] Not started
Phase 5: [          ] Not started
Phase 6: [          ] Not started
```

---

## Performance Metrics (02-01)

| Metric | Value |
|--------|-------|
| Plan | 02-01 |
| Duration | 413s (~7min) |
| Tasks completed | 3 |
| Files changed | 13 |
| Test count after | 157 pass / 0 fail |
| Completed | 2026-06-18 |

## Performance Metrics (02-02)

| Metric | Value |
|--------|-------|
| Plan | 02-02 |
| Duration | ~15min |
| Tasks completed | 2 |
| Files changed | 7 |
| Test count after | 157 pass / 0 fail |
| Completed | 2026-06-18 |

## Performance Metrics

| Metric | Baseline | Current | Target |
|--------|----------|---------|--------|
| SEO audit score | 80/100 (2026-05-22) | — | 90+/100 |
| Schema types covered | Partial | — | All 6 types, all tenants |
| AI referrer sessions | Not measured | — | Measured in GA4 |
| FAQ items per tenant | ~11 | — | 20+ |
| llms.txt tenant-correct | No (leak) | — | Yes, per-tenant |
| INP P75 | Not measured | — | Measured via web-vitals |

---

## Accumulated Context

### Architecture Constraints

- Brownfield — do not rebuild schema scaffolding, extend it
- All JSON-LD stays in `src/lib/seo.ts` as pure functions; never inline schema in `page.tsx`
- All tenant routes are `force-dynamic` — no build-time tenant baking
- Per-tenant config lives in `src/config/tenants/{id}/` + `seo.{locale}.json`
- FR/EN seo.json parity guarded only by `seo-parity.test.ts` — must run in CI
- Deploys via Dokploy VPS webhook on push to main — every phase must leave the site deployable

### Known Risks (from research)

- **Cross-tenant llms.txt leak:** route handler hardcodes "Carrefour Beauport" prose — fix in Phase 5 (LLMS-01)
- **Stub review schema:** `google-reviews.json` is a stub; aggregateRating must be suppressed until `fetchedAt` non-null + `reviewCount >= 5` — fix in Phase 2 (SCHEMA-04)
- **Near-me duplicate content:** target ≥150 words unique opening copy per tenant, <30% sentence overlap — enforce in Phase 4 (PAGE-03)
- **FR parity fragility:** `seo-parity.test.ts` is the only guard; must run in CI after every content phase
- **GA4 AI-referral mis-attribution:** 35-70% of AI traffic lands in Direct; Perplexity needs custom regex channel — addressed in Phase 5 (MEAS-01)

### Package Additions (approved by research)

- `schema-dts@2.0.0` (dev): TypeScript types for JSON-LD — zero runtime cost
- `web-vitals@5.3.0` (runtime, via `useReportWebVitals`): real-user INP at P75
- Do NOT add: `next-seo` (Pages-Router artifact), `@vercel/speed-insights` (Vercel-only)

### Decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| Phase 1 = config gate | Schema/answer blocks emit facts that must exist first; wrong data = bad citations | 2026-06-17 |
| next.config.ts as sole build guard (not prebuild script) | Node 20/Docker cannot transpile .ts imports; Next.js SWC require-hooks make next.config.ts the correct context | 2026-06-18 |
| Config validator Test 1 is GREEN (not RED as planned) | charlesbourg/rivieres configs have non-"XX" storeIds and non-zero geo — structurally complete, just unconfirmed. Validator correctly passes them. Plan 01-2 replaces approximate values with confirmed real data. | 2026-06-18 |
| Review schema guarded against stub data | Eligibility cliff + manual-action penalty risk | 2026-06-17 |
| SeoConfig gets optional reviewData for DI | Avoids process.env manipulation in tests; enables isolated R-02 gate testing per-cfg | 2026-06-18 |
| ReviewData.reviews typed as readonly unknown[] | Avoids circular dep: reviews.ts imports tenant config which imports ReviewData | 2026-06-18 |
| canonicalUrl excluded from SiteSectionSchema (.strict()) | Supabase admin cannot override @id base; structural exclusion enforces T-02-04 mitigation | 2026-06-18 |
| Organization brand node placed first in @graph | Google recommends declaring entities before referencing them; O-01 contract | 2026-06-18 |
| sameAs conditional on non-empty socialProfiles | Emitting sameAs: [] is a schema.org error; I-03 — omit entirely when no profiles exist | 2026-06-18 |
| Keep FAQPage schema despite SERP deprecation | Still crawled by PerplexityBot/Bingbot; removal loses AI citation surface | 2026-06-17 |
| Off-site link-building out of scope | Marketing-ops, not on-site engineering | 2026-06-17 |
| LOCAL-01 assigned to Phase 5 | Phase 5 is the implementation phase; Phase 6 is verification | 2026-06-17 |

### Todos

- [ ] Plan Phase 1 (`/gsd-plan-phase 1`)
- [ ] Identify all secondary-tenant config TODOs (15+ flagged in PROJECT.md)
- [ ] Confirm real vs suppress-schema decision for secondary-tenant review data

### Blockers

None at roadmap creation.

---

## Session Continuity

**Stopped at:** Phase 3 complete — executed end-to-end (waves 1→2→3→4), pushed 2f77d85 → Dokploy deploy. Blocking checkpoint (03-05 Task 4) approved by user (push now). SC-4 manual AI-citation spot-check pending indexing.
**Resume file:** .planning/phases/03-content-depth/03-UAT.md (run SC-4 once live)

**Last session:** 2026-06-19T05:00:00.000Z
**Completed this session:** Phase 3 (Content Depth) executed inline (Opus, TDD). 03-01 RED foundation (splitter D-13, unwired D-05/D-11 guards, stubs, parity); 03-02 shared runtime (FaqItem, getTenantFaq, AnswerBlock, Accordion link); 03-03 FAQ depth (base de-tenanted to 9, per-tenant faq ≥13 → union 22/tenant/locale, /faq union F-01); 03-04 answer blocks (distinct copy + AnswerBlock first-in-main, single h1 on 4 page types); 03-05 guards wired build-blocking + gate-bites tests + 03-UAT.md. 282 tests pass, build green, frozen-lockfile OK. 15 commits (bce3d8b…2f77d85).

**Next action:** Verify live deploy on the 3 tenant hosts + run 03-UAT.md SC-4 spot-check. Then Phase 4 (Net-New Pages) — `/gsd-plan-phase 4`.

---

*State initialized: 2026-06-17*
