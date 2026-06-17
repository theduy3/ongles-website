# ongles-website — AI-Search Optimization Milestone

## What This Is

A multi-tenant Next.js salon website serving multiple nail-salon brands (e.g. `ongles-maily`, `ongles-charlesbourg`) from one Docker image, runtime-selected by a `TENANT` env var, in French (default) and English. This milestone turns the existing site into a fully AI-search-optimized property: it must win classic + near-me search, get cited by AI answer engines (ChatGPT, Perplexity, Claude, Gemini), and convert high-intent visitors — for **every** tenant.

## Core Value

Each tenant's pages are factual, structured, and trust-heavy enough that both humans and AI answer engines can extract the salon's services, pricing, location, and booking path — and act on them. If everything else fails, the salon's core facts must be machine-extractable and a booking CTA must be one click away.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. Inferred from codebase map (.planning/codebase/) + prior SEO audit (tasks/seo-action-plan.md). -->

- ✓ Multi-tenant runtime resolution — one Docker image, `TENANT` env var, `TENANT_REGISTRY` validation — existing (`src/config/index.ts`)
- ✓ Per-tenant config merge — static defaults + Supabase sparse overrides via `deepMerge()`, 60s cache, tag revalidation — existing (`src/lib/store-config.ts`)
- ✓ FR/EN locale routing + dictionaries — middleware locale prefix, `src/dictionaries/{fr,en}.json` — existing (`src/proxy.ts`)
- ✓ Service pages + dynamic `services/[slug]` — existing (`src/app/[lang]/services/`)
- ✓ Location pages — existing (`src/app/[lang]/locations/`)
- ✓ FAQ page — existing (`src/app/[lang]/faq/`)
- ✓ Trust pages — about, reviews, contact — existing (`src/app/[lang]/{about,reviews,contact}/`)
- ✓ Legal pages — privacy, terms — existing
- ✓ JSON-LD schema present across layout + key pages — existing (`src/app/[lang]/layout.tsx` + page-level)
- ✓ Crawl layer — `robots.ts`, `sitemap.ts`, `llms.txt`, `manifest.ts`, per-locale `generateMetadata` — existing (`src/app/`)
- ✓ Legacy-SEO shim — folds orphaned `content`-namespace SEO into the `seo` layer at read time — shipped (`src/app/[lang]/legacy-seo-shim.ts`)
- ✓ Per-tenant SEO content — `src/config/tenants/{id}/seo.{locale}.json` — existing
- ✓ Image/perf baseline — hero+home PNG→WebP (−96%), dedicated og:image, `poweredByHeader:false` — shipped (per `tasks/seo-action-plan.md`, 2026-05-22 audit 80/100)
- ✓ SalonX widget embeds — booking, checkin, queue, clientportal, subscription — existing (`src/components/*Widget.tsx`)
- ✓ Admin panel — settings/popups/overrides with iron-session auth — existing (`src/app/admin/`)
- ✓ Contact + newsletter forms — Resend + Supabase, zod-validated — existing (`src/app/api/`)
- ✓ force-dynamic rendering on tenant routes — prevents build-time tenant baking — existing

### Active

<!-- This milestone. Hypotheses until shipped + validated. -->

**Phase-1 prerequisite (gates all SEO/GEO work):**
- [ ] Complete per-tenant config for all tenants — NAP, hours, full service menu with pricing — clearing the 15+ open secondary-tenant config TODOs

**Classic SEO (balanced weight):**
- [ ] Schema completeness audit + fill per tenant — LocalBusiness, Service/AggregateOffer, FAQPage, Review, BreadcrumbList, Organization
- [ ] Local-SEO entity consistency — name/address/phone/hours identical across site + external profiles
- [ ] Conversion hardening — sticky book/quote CTA on mobile, trust signals + price anchors above the fold

**GEO / AI-citation (balanced weight):**
- [ ] "Direct answer block" content pattern on key pages — lead with the answer, then detail
- [ ] Deepen FAQ / knowledge hub — short, factual, retrieval-friendly blocks
- [ ] Comparison / decision pages — "X vs Y", "best for" (net-new route type)
- [ ] Cost / pricing pages — dedicated, structured pricing (net-new)
- [ ] Expand + validate `llms.txt` depth per tenant

**Measurement (cross-cutting):**
- [ ] AI-referrer measurement — GA4 events (call/form/booking/chat) + referrer segments for ChatGPT, Perplexity, Claude, Gemini; page-level conversion tracking

### Out of Scope

<!-- Explicit boundaries with reasoning. -->

- ES (Spanish) locale content — planned, not this milestone; keep parity scaffolding only (`Locale = fr|en|es` already typed) so adding it later is clean
- Onboarding net-new tenants beyond existing brands — milestone hardens SEO/GEO for current tenants, not tenant expansion
- Rebuilding the booking/checkin/widget system — third-party SalonX, outside our control; we optimize the pages that host it
- Off-site link-building / outreach campaigns — execution is a marketing-ops activity, not on-site engineering; we ship on-site structure + measurement that *enables* citations
- Replacing GA4 / analytics platform — we add segments + events on the existing analytics, not swap stacks

## Context

- **Brownfield.** Most of the plan's "build deliverables" already ship (schema, robots, sitemap, llms.txt, service/location/FAQ/trust pages, FR/EN, image/perf baseline). The gap is depth, net-new page types (comparison, cost), per-tenant data completeness, and AI-referrer measurement — not scaffolding.
- **Prior SEO work to reuse:** `tasks/seo-audit-report.md` + `tasks/seo-action-plan.md` (2026-05-22 audit, 80/100) already closed images/og/llms.txt/meta items — don't re-propose them.
- **SEO data model:** per-tenant `seo.{locale}.json` + JSON-LD in layouts/pages; legacy `content`-namespace SEO is folded in by `legacy-seo-shim.ts`. Service type carries `price` + `priceTo` for `AggregateOffer` schema.
- **Known concerns** (from `.planning/codebase/CONCERNS.md`): locale/dictionary parity is runtime-only (no compile-time guard); 15+ secondary-tenant config TODOs; `STANDALONE_PATHS` is a hardcoded allowlist; widget components lack test coverage; `google-reviews.json` is a stub/generated dependency.
- **Deploy:** push to `main` auto-deploys via Dokploy VPS webhook — no GitHub Actions. Verify on the live host (~1 min after merge).
- Full codebase map at `.planning/codebase/` (STACK, ARCHITECTURE, STRUCTURE, CONVENTIONS, TESTING, INTEGRATIONS, CONCERNS).

## Constraints

- **Tech stack**: Next.js 16.2.6 (non-standard — breaking changes vs training data; read `node_modules/next/dist/docs/` before writing Next.js code), React 19, App Router, TypeScript 5 strict, Tailwind 4 — match existing patterns
- **Rendering**: `force-dynamic` mandatory on all tenant-content routes — static generation bakes build-time tenant data and breaks multi-tenancy
- **Multi-tenant**: never hardcode tenant data; always resolve via `getStoreConfig()` / `resolveTenant()`; SEO output must be per-tenant
- **Locale parity**: `fr.json` and `en.json` must keep identical key structure; missing keys silently become `undefined` (no build-time check) — sync every locale file
- **Data**: Supabase required at render (60s cache, sparse override model); no offline fallback beyond static config
- **Deployment**: Dokploy webhook on `main` push; verify SEO/schema output on the live host, not just locally
- **Testing**: bun:test for unit (`src/*.test.ts`), Playwright for E2E (`./e2e`, port 3100); widget/SEO components currently thin on coverage

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Harden existing site, don't rebuild | SEO/GEO scaffolding already ships; gap is depth + net-new pages | — Pending |
| All tenants/domains in scope | User intent — every salon brand gets the treatment | — Pending |
| Balanced SEO + GEO weight | Classic ranking scaffolding exists; AI-citation is the novel lever; pursue both | — Pending |
| Phase 1 = complete per-tenant config | SEO/GEO quality is gated by tenant facts (NAP, services, pricing) feeding schema/answer blocks | — Pending |
| Off-site link-building out of scope | On-site structure + measurement is our control surface; outreach is marketing ops | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-17 after initialization*
