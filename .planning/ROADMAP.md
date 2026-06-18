# Roadmap: ongles-website — AI-Search Optimization Milestone

**Project:** Multi-tenant nail salon website (ongles-maily, ongles-charlesbourg, + others)
**Core Value:** Each tenant's pages are factual, structured, and trust-heavy enough that both humans and AI answer engines can extract the salon's services, pricing, location, and booking path — and act on them.
**Milestone:** AI-Search Optimization (classic SEO + GEO/AI-citation)
**Granularity:** Standard
**Created:** 2026-06-17

---

## Phases

- [ ] **Phase 1: Per-Tenant Config Completion** - Gate: complete NAP, hours, and full service menu with pricing for every tenant
- [ ] **Phase 2: Schema Completeness + Correctness** - Fill and validate all JSON-LD types per tenant on the existing builder boundary
- [ ] **Phase 3: Content Depth** - Direct-answer blocks on key pages + deepened FAQ content across locales
- [ ] **Phase 4: Net-New Pages** - Pricing, comparison/decision, and near-me neighborhood pages
- [ ] **Phase 5: llms.txt Depth + Measurement** - Fix cross-tenant llms.txt leak, deepen per-tenant agent layer, wire GA4 AI-referrer + conversion tracking + CWV
- [ ] **Phase 6: Cross-Tenant Correctness Audit** - Verify per-tenant/per-locale schema, NAP, and conversion correctness across all brands

---

## Phase Details

### Phase 1: Per-Tenant Config Completion

**Goal**: Every tenant has complete, correct NAP + hours + full service menu with pricing in static config, unblocking all downstream schema and content work
**Mode:** mvp
**Depends on**: Nothing (first phase — hard prerequisite gate)
**Requirements**: CONFIG-01, CONFIG-02

**Success Criteria** (what must be TRUE):
1. Every tenant config file has non-empty name, address, phone, and hours that are identical across all on-site surfaces that read them
2. Every tenant config has a complete service menu with at least one price per service — the 15+ secondary-tenant config TODOs are resolved
3. No schema builder or page component falls back to a placeholder, empty string, or undefined when rendering any tenant
4. A local dev run with TENANT=ongles-charlesbourg (and any other secondary tenant) produces fully populated service listings and NAP data with no console warnings about missing config keys

**Plans**: 2 plans
- [ ] 01-1-PLAN.md — Config-completeness validator + failing bun:test + next.config.ts build guard (TDD machinery, autonomous)
- [ ] 01-2-PLAN.md — Human checkpoint (filled data checklist) then copy real values into Charlesbourg + Rivières config; turn guard GREEN

---

### Phase 2: Schema Completeness + Correctness

**Goal**: Every tenant emits valid, typed, complete JSON-LD across all required schema types, with review schema guarded against stub data and CI enforcing parity
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04, SCHEMA-05, SCHEMA-06

**Success Criteria** (what must be TRUE):
1. Google Rich Results Test passes for NailSalon (LocalBusiness) JSON-LD on all tenant home pages, with a stable per-tenant `@id` URI that does not collide across tenants
2. Service pages emit Service + AggregateOffer JSON-LD sourced from config pricing — validated by Rich Results Test for at least one service per tenant
3. FAQPage schema emits every FAQ item present in `dictionaries/{en,fr}.json` with no missing entries
4. AggregateRating / Review schema is absent (suppressed) when `google-reviews.json` has `fetchedAt: null` or `reviewCount < 5`; it appears correctly when real data is present
5. CI test suite includes `schema-dts` compile-time typing and a `seo-parity` test that fails when FR `seo.json` keys diverge from EN — and this test passes on all tenants

**Plans**: 4 plans (4 waves)
- [x] 02-01-review-data-suppression-PLAN.md — per-tenant review data + AggregateRating suppression gate (SCHEMA-04) ✅ 2026-06-18
- [x] 02-02-canonical-id-organization-PLAN.md — stable canonicalUrl + brand Organization node + sameAs omit (SCHEMA-01, SCHEMA-05) ✅ 2026-06-18
- [x] 02-03-invariants-build-guard-PLAN.md — schema-dts typing + offline invariant module + next.config.ts build guard (SCHEMA-01/02/04/05/06) ✅ 2026-06-18
- [x] 02-04-faq-completeness-parity-PLAN.md — F-01 FAQ completeness invariant (build-guard) + F-02 dictionaries FR/EN parity (SCHEMA-03/SCHEMA-06) ✅ 2026-06-18 — FAQPage completeness (F-01) + dictionary FR/EN FAQ parity (F-02) (SCHEMA-03, SCHEMA-06)

---

### Phase 3: Content Depth

**Goal**: Key pages lead with direct-answer blocks, and FAQ content is deepened with locale-parity enforced, maximizing AI-citation retrieval and long-tail search coverage
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: CONTENT-01, CONTENT-02

**Success Criteria** (what must be TRUE):
1. Home, service, and location pages open with a self-contained direct-answer paragraph (≥2 sentences answering the implicit "what is this / what do you offer / where are you" question) before any marketing copy or section headers
2. FAQ content in `dictionaries/{en,fr}.json` covers at least 20 distinct question-answer pairs per tenant, up from the current ~11, and FR keys are identical in structure to EN (no missing keys)
3. The `seo-parity` CI test passes after content additions — no new FR parity gaps introduced
4. A manual spot-check of ChatGPT or Perplexity for "[salon name] services [city]" returns at least one factual sentence drawn from the site's answer blocks or FAQ content

**Plans**: TBD
**UI hint**: yes

---

### Phase 4: Net-New Pages

**Goal**: Pricing, comparison, and near-me pages exist per tenant with structured schema and unique copy, covering high-intent search and AI-citation patterns not served by existing routes
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: PAGE-01, PAGE-02, PAGE-03

**Success Criteria** (what must be TRUE):
1. A `/[lang]/tarifs` (pricing) page exists per tenant, renders service pricing from config as an HTML table or list, and emits ItemList + AggregateOffer JSON-LD that passes Rich Results Test
2. At least two comparison/decision pages exist (e.g. `/[lang]/gel-vs-acrylique`, `/[lang]/meilleur-pour`) per tenant with direct-answer blocks and ≥200 words of unique copy per page
3. Near-me / neighborhood pages exist per tenant with ≥150 words of unique opening copy — sentence overlap across tenants is below 30% (no cross-tenant duplication)
4. All new routes are included in `sitemap.ts` output and are reachable without a 404 or redirect on both FR and EN locales

**Plans**: TBD
**UI hint**: yes

---

### Phase 5: llms.txt Depth + Measurement

**Goal**: The agent-readable layer is per-tenant and complete; GA4 captures AI-referrer traffic and conversion events; real-user INP is reported — giving a before/after baseline for all content phases
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: LLMS-01, LLMS-02, LOCAL-01, CONV-01, CONV-02, MEAS-01, MEAS-02

**Success Criteria** (what must be TRUE):
1. `llms.txt` served for ongles-charlesbourg (and all non-maily tenants) contains only facts true for that tenant — no "Carrefour Beauport" or ongles-maily-specific prose; the cross-tenant fact leak is eliminated
2. Per-tenant `site.llmsDescription` is populated with services, hours, location, and booking path — `llms.txt` output exceeds 200 words of unique, factual content per tenant
3. GA4 has a custom channel group capturing AI-Assistant traffic (native GA4 June 2026 channel) plus a Perplexity regex channel; conversion events (call click, form submit, booking click) fire at page level and are visible in GA4 DebugView
4. Mobile pages display a sticky book/quote CTA that persists on scroll and is visible above the fold without user action
5. Trust signals and price anchors (e.g. price range, review count, credentials) appear above the fold on home and service pages
6. `web-vitals` reports real-user INP (P75) and other Core Web Vitals to the console (or analytics endpoint) — confirmed via browser DevTools Network tab

**Plans**: TBD
**UI hint**: yes

---

### Phase 6: Cross-Tenant Correctness Audit

**Goal**: All tenants pass a structured correctness check across schema, NAP, canonical/hreflang, llms.txt, and conversion surfaces — no per-tenant or per-locale regression before milestone sign-off
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: LOCAL-01 (verification pass)

**Success Criteria** (what must be TRUE):
1. NAP (name, address, phone, hours) values rendered on-site match the values in static config for every tenant — zero discrepancies found in audit
2. Schema validity check (Rich Results Test or equivalent) passes for every required schema type on every tenant's home, service, and FAQ pages in both FR and EN
3. `llms.txt` and `sitemap.ts` output for each tenant contains only tenant-correct facts — no cross-tenant data bleed detected
4. The `seo-parity` CI test passes with all content from Phases 3–4 included — no FR/EN key gaps
5. Core Web Vitals (INP, LCP, CLS) baselines are recorded per tenant via `web-vitals` and there are no regressions vs. pre-milestone Lighthouse scores

**Plans**: TBD

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Per-Tenant Config Completion | 0/2 | Not started | - |
| 2. Schema Completeness + Correctness | 0/4 | Planned | - |
| 3. Content Depth | 0/? | Not started | - |
| 4. Net-New Pages | 0/? | Not started | - |
| 5. llms.txt Depth + Measurement | 0/? | Not started | - |
| 6. Cross-Tenant Correctness Audit | 0/? | Not started | - |

---

## Coverage Map

| Requirement | Phase |
|-------------|-------|
| CONFIG-01 | Phase 1 |
| CONFIG-02 | Phase 1 |
| SCHEMA-01 | Phase 2 |
| SCHEMA-02 | Phase 2 |
| SCHEMA-03 | Phase 2 |
| SCHEMA-04 | Phase 2 |
| SCHEMA-05 | Phase 2 |
| SCHEMA-06 | Phase 2 |
| CONTENT-01 | Phase 3 |
| CONTENT-02 | Phase 3 |
| PAGE-01 | Phase 4 |
| PAGE-02 | Phase 4 |
| PAGE-03 | Phase 4 |
| LLMS-01 | Phase 5 |
| LLMS-02 | Phase 5 |
| LOCAL-01 | Phase 5 |
| CONV-01 | Phase 5 |
| CONV-02 | Phase 5 |
| MEAS-01 | Phase 5 |
| MEAS-02 | Phase 5 |

**Total v1:** 20 requirements
**Mapped:** 20/20
**Unmapped:** 0

Note: LOCAL-01 (NAP consistency) is assigned to Phase 5 as the implementation phase (documented on-site alignment) with Phase 6 as the verification pass. It is mapped once — Phase 5 owns the deliverable.

---

*Roadmap created: 2026-06-17*
