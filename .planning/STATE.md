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
| Phase | 1 |
| Phase name | Per-Tenant Config Completion |
| Plan | None (phase not yet planned) |
| Status | Not started |
| Progress | 0/6 phases complete |

```
Progress: [          ] 0%
Phase 1: [          ] Not started
Phase 2: [          ] Not started
Phase 3: [          ] Not started
Phase 4: [          ] Not started
Phase 5: [          ] Not started
Phase 6: [          ] Not started
```

---

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
| Review schema guarded against stub data | Eligibility cliff + manual-action penalty risk | 2026-06-17 |
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

**Last session:** Roadmap created 2026-06-17
**Completed this session:** PROJECT.md + REQUIREMENTS.md read; ROADMAP.md + STATE.md written; REQUIREMENTS.md traceability updated

**Next action:** Run `/gsd-plan-phase 1` to plan Phase 1 — Per-Tenant Config Completion

---

*State initialized: 2026-06-17*
