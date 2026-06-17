# Project Research Summary

**Project:** ongles-website — AI-Search Optimization Milestone
**Domain:** SEO + GEO (AI-citation) for a multi-tenant, multi-locale local-service (nail salon) website
**Researched:** 2026-06-17
**Confidence:** HIGH (stack/architecture), MEDIUM (GEO citation efficacy — fast-moving, attribution lossy)

## Executive Summary

This is a brownfield optimization milestone, not a build. The existing Next.js 16 App Router site already ships the SEO scaffolding most plans start from — per-tenant JSON-LD (built in `src/lib/seo.ts`), `robots.ts`, `sitemap.ts`, `llms.txt`, per-locale `generateMetadata`, and service/location/FAQ/trust pages — all force-dynamic and tenant-correct at request time. The work is **depth, net-new page types, per-tenant data completeness, and measurement**, layered on a clean schema-builder boundary.

The recommended approach is a strict **data → schema → pages → llms.txt + measurement** build order. Per-tenant config completeness is the gate: schema and "answer blocks" emit facts (NAP, hours, services, pricing) that must exist in config first, or the site gets *cited with wrong/empty data* — worse than not being cited. Only two packages need adding (`schema-dts`, `web-vitals`); everything else is content discipline and config.

The dominant risks are correctness, not capability: a cross-tenant fact leak already exists in `llms.txt`, `aggregateRating` schema would fire on stub review data, near-identical tenant pages risk silent duplicate-content filtering, and FR `seo.json` parity is only guarded by one test. These must be fixed before content scales.

## Key Findings

### Recommended Stack

Minimal additions on top of the existing stack — the framework-level SEO surface (`generateMetadata`, route-handler `robots`/`sitemap`/`llms.txt`) is already correct for App Router. Add compile-time schema typing and real-user vitals; everything else is config or already present.

**Core technologies:**
- `schema-dts@2.0.0` (dev): TypeScript types for JSON-LD — catches `NailSalon` vs `LocalBusiness` mistakes at compile time, zero runtime cost
- `web-vitals@5.3.0` (runtime, via `useReportWebVitals`): real-user INP at P75 — INP cannot be measured in Lighthouse at all
- `NailSalon` schema type (schema.org V30: `LocalBusiness → HealthAndBeautyBusiness → NailSalon`) with a stable per-tenant `@id` so search/LLMs don't create competing entities across tenant pages
- **Do NOT add:** `next-seo` (Pages-Router artifact, hydration races in App Router), `@vercel/speed-insights` (Vercel-only, won't run on the Dokploy VPS), Lighthouse for INP (can't measure it)

See `.planning/research/STACK.md` (328 lines).

### Expected Features

See `.planning/research/FEATURES.md` (189 lines).

**Must have (table stakes):**
- Direct answer blocks on key pages — pure copy discipline, zero code change, highest citation ROI; not yet applied
- FAQ/knowledge-hub depth — current ~11 items too thin for long-tail; FAQPage schema already emits all items, so adding to `dictionaries/{en,fr}.json` needs no code change
- Dedicated pricing page — highest-value net-new route; prices already in config, needs an `ItemList` + `AggregateOffer` graph
- Per-tenant schema completeness — LocalBusiness(NailSalon)/Service/AggregateOffer/FAQPage/Review/BreadcrumbList/Organization
- Keep FAQPage schema — Google killed the SERP dropdown (May 2026) but PerplexityBot/Bingbot still crawl it; removing it would be a mistake
- NAP consistency across site + external profiles (local ranking)

**Should have (competitive differentiators):**
- Comparison/decision pages ("gel vs acrylique", "best for") — bottom-of-funnel, low local-competitor coverage, high AI-citation match
- Near-me / neighborhood pages — geo-targeted unique copy
- Individual Review schema nested under Service nodes (not LocalBusiness — that's the Google-ineligible pattern)
- AI-referrer GA4 channel group — needs to exist before new pages ship, for a baseline

**Defer / anti-features (deliberately skip):**
- Self-serving/fabricated review schema — eligibility cliff + penalty risk
- Blocking AI crawlers — current `robots.ts` is correctly open; leave it
- Removing FAQPage schema post-deprecation — wrong read of what changed
- Keyword-stuffed neighborhood copy — duplicate-content / spam risk

### Architecture Approach

Keep the clean boundary: all JSON-LD construction stays in `src/lib/seo.ts` as injected-config pure functions; net-new page types get new builder functions there, never inline schema in `page.tsx`. Crawl-layer files (`sitemap.ts`, `robots.ts`, `llms.txt/route.ts`) are already force-dynamic and resolve `getStoreConfig()` per request — no architectural change, only content/correctness gaps. See `.planning/research/ARCHITECTURE.md` (438 lines).

**Major components:**
1. Per-tenant config (static `src/config/tenants/{id}/` + `seo.{locale}.json`) — the fact source feeding everything
2. Schema builders (`src/lib/seo.ts`) — pure functions; one per schema type, extended for new page types
3. Crawl layer (`sitemap.ts`/`robots.ts`/`llms.txt`) — per-tenant, per-locale output; needs per-tenant `site.llmsDescription`
4. Page/content layer — answer blocks, FAQ depth, net-new comparison/pricing/neighborhood routes
5. Measurement — `web-vitals` reporting + GA4 AI-referrer channel + conversion events

### Critical Pitfalls

Top risks from `.planning/research/PITFALLS.md` (374 lines):

1. **Cross-tenant fact leak in `llms.txt`** — route handler hardcodes "Carrefour Beauport" prose true only for `ongles-maily`; secondary tenants serve wrong facts. Fix: per-tenant `site.llmsDescription`.
2. **`aggregateRating` on stub reviews** — `google-reviews.json` is a stub; suppress aggregateRating/Review schema until `fetchedAt` is non-null and `reviewCount >= 5`. Firing on fake data risks manual action.
3. **Duplicate content across near-identical tenant pages** — silent filtering (not penalty) above ~30% sentence overlap; target ≥150 words of unique opening copy per tenant/page.
4. **FR `seo.json` parity is fragile** — `SeoDictionary = typeof seo.en.json` catches EN gaps at compile time, but FR omissions are silent runtime `undefined`; `seo-parity.test.ts` is the only guard — must run in CI.
5. **AI-referral mis-attribution** — GA4 native "AI Assistant" channel (June 2026) excludes Perplexity; 35–70% of AI traffic lands in Direct (referrer stripping). Track trends, not absolutes; add a custom regex channel for Perplexity.

## Implications for Roadmap

Research strongly supports a **data → schema → pages → llms.txt + measurement** order, matching the milestone's Phase-1 prerequisite decision.

### Phase 1: Per-Tenant Config Completion (gate)
**Rationale:** Schema + answer blocks emit facts that must exist first; clears the 15+ secondary-tenant TODOs.
**Delivers:** Complete NAP, hours, full service menu + pricing for every tenant.
**Avoids:** Citation with wrong/empty data; aggregateRating on missing data.

### Phase 2: Schema Completeness + Correctness
**Rationale:** With facts present, fill and validate structured data on the existing builder boundary.
**Delivers:** `NailSalon` type w/ stable `@id`, Service/AggregateOffer/FAQPage/Review/Breadcrumb/Organization per tenant; `schema-dts` typing; review-schema guard.
**Uses:** `schema-dts`; `src/lib/seo.ts`.
**Avoids:** Stub-review schema; invalid/spammy schema.

### Phase 3: Content Depth (answer blocks + FAQ)
**Rationale:** Highest citation ROI, mostly zero-code copy work once schema is sound.
**Delivers:** Direct-answer blocks on key pages; deepened FAQ in `dictionaries/{en,fr}.json` with parity.
**Avoids:** Thin content; FR parity gaps (CI-gated).

### Phase 4: Net-New Pages (pricing, comparison, neighborhood)
**Rationale:** New routes depend on complete data + sound schema + answer-block pattern.
**Delivers:** Pricing page (ItemList+AggregateOffer), comparison/decision pages, near-me pages with unique copy.
**Avoids:** Duplicate-content filtering across tenants.

### Phase 5: llms.txt Depth + AI-Referrer Measurement
**Rationale:** Finalize agent-readable layer + instrument before/after content scales.
**Delivers:** Per-tenant `site.llmsDescription` (fixes leak); `web-vitals` reporting; GA4 AI-Assistant + custom Perplexity channel; conversion events.
**Avoids:** Cross-tenant leak; mis-attribution.

### Phase 6: Cross-Tenant Correctness Audit
**Rationale:** Verify per-tenant/per-locale correctness across all brands before sign-off.
**Delivers:** Audit of schema/NAP/canonical/hreflang/llms.txt per tenant; CWV/INP regression check.

### Phase Ordering Rationale
- Data is the hard dependency for every schema/answer-block downstream — it must be Phase 1.
- Schema correctness must precede content scale so new pages inherit valid structured data.
- Measurement before net-new content gives a clean before/after baseline.

### Research Flags
- **Phase 5 (measurement):** GEO attribution is lossy and fast-moving — re-verify GA4 channel behavior + AI-bot UAs at planning time.
- **Phase 4 (comparison/neighborhood):** duplicate-content thresholds need per-tenant copy strategy — plan unique-copy budget.
- Phases 1–3 use established patterns already in-repo — lighter research.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Few adds; framework SEO surface already correct; versions web-verified |
| Features | HIGH | Clear table-stakes/differentiator split; most map to existing data |
| Architecture | HIGH | Clean existing schema-builder boundary; per-tenant flow understood |
| Pitfalls | MEDIUM-HIGH | Concrete + codebase-specific; GEO efficacy itself is inherently uncertain |

**Overall confidence:** HIGH for execution path; MEDIUM on GEO citation *outcomes* (industry-wide uncertainty + lossy attribution).

### Gaps to Address
- AI-citation efficacy is not directly measurable — instrument referrals + periodic manual "what does ChatGPT/Perplexity say about us" checks; treat as trend, not KPI.
- Claude referral attribution is the weakest in 2026 — accept gap, lean on Perplexity (cleanest) + manual checks.
- Secondary-tenant review data (`google-reviews.json` stub) — Phase 1/2 must decide real-fetch vs suppress-schema per tenant.

## Sources

### Primary (HIGH confidence)
- schema.org V30 (NailSalon hierarchy), Google Search Central structured-data docs
- Next.js 16 App Router metadata/route-handler docs (`node_modules/next/dist/docs/`)
- OpenAI / Anthropic / Perplexity published crawler user-agent docs; GA4 channel-group docs (June 2026 AI Assistant)

### Secondary (MEDIUM confidence)
- GEO/AI-citation practitioner consensus (mid-2026) on answer blocks, llms.txt efficacy, referral attribution loss

### Tertiary (LOW confidence)
- llms.txt citation-impact claims — no confirmed ranking/citation signal; value is brand-governance + dev tooling

---
*Research completed: 2026-06-17*
*Ready for roadmap: yes*
