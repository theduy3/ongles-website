# Requirements: ongles-website — AI-Search Optimization Milestone

**Defined:** 2026-06-17
**Core Value:** Each tenant's pages are factual, structured, and trust-heavy enough that both humans and AI answer engines can extract the salon's services, pricing, location, and booking path — and act on them.

## v1 Requirements

Requirements for this milestone. Each maps to a roadmap phase. Applies to **all tenants**, balanced classic-SEO + GEO.

### Config (Phase-1 gate)

- [ ] **CONFIG-01**: Every tenant has complete name, address, phone, and hours in its static config
- [ ] **CONFIG-02**: Every tenant has its full service menu with prices, clearing the 15+ open secondary-tenant config TODOs

### Schema

- [ ] **SCHEMA-01**: Each tenant emits `NailSalon` LocalBusiness JSON-LD with a stable per-tenant `@id`
- [ ] **SCHEMA-02**: Each service emits Service + AggregateOffer JSON-LD from config pricing
- [ ] **SCHEMA-03**: FAQ pages emit complete FAQPage JSON-LD for every FAQ item
- [ ] **SCHEMA-04**: Review/AggregateRating JSON-LD is nested under Service and is suppressed when review data is stub/empty (`google-reviews.json` `fetchedAt` null or `reviewCount < 5`)
- [ ] **SCHEMA-05**: Pages emit BreadcrumbList JSON-LD; site emits Organization JSON-LD
- [ ] **SCHEMA-06**: JSON-LD builders are typed with `schema-dts`, and schema validity + FR/EN `seo.json` parity are enforced by CI tests

### Content (GEO)

- [ ] **CONTENT-01**: Home, service, and location pages open with a direct-answer block (answer first, then detail)
- [ ] **CONTENT-02**: FAQ content in `dictionaries/{en,fr}.json` is deepened, with identical key structure across locales

### Net-New Pages

- [ ] **PAGE-01**: A dedicated pricing page renders structured pricing (ItemList + AggregateOffer) per tenant
- [ ] **PAGE-02**: Comparison/decision pages exist (e.g. "gel vs acrylique", "best for") with answer blocks
- [ ] **PAGE-03**: Near-me / neighborhood pages exist with ≥150 words of unique copy per tenant (no cross-tenant duplication)

### Agent Layer

- [ ] **LLMS-01**: `llms.txt` facts are per-tenant via `site.llmsDescription` (no hardcoded cross-tenant prose)
- [ ] **LLMS-02**: `llms.txt` content is deepened per tenant (services, locations, hours, booking)

### Local + Conversion

- [ ] **LOCAL-01**: Name/address/phone/hours are consistent across all on-site surfaces (and documented for external-profile alignment)
- [ ] **CONV-01**: Mobile pages show a sticky book/quote CTA
- [ ] **CONV-02**: Trust signals and price anchors appear above the fold on key pages

### Measurement

- [ ] **MEAS-01**: GA4 captures AI-referrer traffic (native AI-Assistant channel + custom Perplexity regex channel) and conversion events (call/form/booking/chat) at page level
- [ ] **MEAS-02**: Real-user INP (and other Core Web Vitals) are reported via `web-vitals`

## v2 Requirements

Deferred. Tracked, not in this roadmap.

### Localization

- **ES-01**: Spanish-locale content across all page types (scaffolding/typing kept ready; content deferred)

### Schema (extended)

- **SCHEMA-07**: Additional schema types as opportunities emerge (e.g. Event for promotions, HowTo for care guides)

## Out of Scope

Explicitly excluded.

| Feature | Reason |
|---------|--------|
| Off-site link-building / outreach campaigns | Marketing-ops activity, not on-site engineering; we ship the structure + measurement that enables citations |
| Onboarding net-new tenants beyond existing brands | Milestone hardens SEO/GEO for current tenants, not tenant expansion |
| Rebuilding the booking/checkin/widget system | Third-party SalonX, outside our control |
| Replacing GA4 / analytics platform | We add segments + events on existing analytics, not swap stacks |
| Fabricated / self-serving review schema | Eligibility cliff + manual-action penalty risk (research anti-feature) |
| Blocking AI crawlers | Current `robots.ts` is correctly open; GEO goal requires retrieval bots allowed |
| Removing FAQPage schema post-SERP-deprecation | Still crawled by PerplexityBot/Bingbot; removal would lose AI citation surface |

## Traceability

Each v1 requirement maps to exactly one phase.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CONFIG-01 | Phase 1 | Pending |
| CONFIG-02 | Phase 1 | Pending |
| SCHEMA-01 | Phase 2 | Pending |
| SCHEMA-02 | Phase 2 | Pending |
| SCHEMA-03 | Phase 2 | Pending |
| SCHEMA-04 | Phase 2 | Pending |
| SCHEMA-05 | Phase 2 | Pending |
| SCHEMA-06 | Phase 2 | Pending |
| CONTENT-01 | Phase 3 | Pending |
| CONTENT-02 | Phase 3 | Pending |
| PAGE-01 | Phase 4 | Pending |
| PAGE-02 | Phase 4 | Pending |
| PAGE-03 | Phase 4 | Pending |
| LLMS-01 | Phase 5 | Pending |
| LLMS-02 | Phase 5 | Pending |
| LOCAL-01 | Phase 5 | Pending |
| CONV-01 | Phase 5 | Pending |
| CONV-02 | Phase 5 | Pending |
| MEAS-01 | Phase 5 | Pending |
| MEAS-02 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20/20
- Unmapped: 0

---
*Requirements defined: 2026-06-17*
*Last updated: 2026-06-17 — traceability populated by roadmapper*
