# Phase 5: llms.txt Depth + Measurement - Context

**Gathered:** 2026-06-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Three disjoint sub-domains plus one consistency check, per tenant, FR/EN only, on one Docker image serving 3 separate legal salons:

1. **AI-discovery layer (LLMS-01/02)** — Fix the cross-tenant `llms.txt` leak (the route hardcodes "Carrefour Beauport, Québec City" prose, wrong for charlesbourg/rivieres) and deepen each tenant's `llms.txt` to >200 unique words via a new per-tenant `site.llmsDescription` field + config-generated facts.
2. **Measurement (MEAS-01/02)** — Stand up GA4 (currently **none** exists) capturing AI-referrer traffic + conversion events at page level, and report real-user INP + Core Web Vitals via `web-vitals@5.3.0` (already approved in STATE.md).
3. **Conversion surfaces (CONV-01/02)** — Harden the already-mounted mobile sticky CTA (`FloatingCTA`, site-wide in `layout.tsx`) and guarantee trust signals + price anchors sit above the fold on key pages.
4. **NAP consistency (LOCAL-01)** — Verify name/address/phone/hours are identical across all on-site surfaces and produce a documented reference for external-profile (GBP/directory) alignment.

Maps to **LLMS-01, LLMS-02, LOCAL-01, CONV-01, CONV-02, MEAS-01, MEAS-02**.

**Brownfield reality:** GA4 and web-vitals are **fully net-new** (no gtag/dataLayer/web-vitals anywhere in `src`). `FloatingCTA` already renders site-wide — CONV-01 is *verify + instrument*, not build. Trust components (`Stars`, `WhyChooseUs`, `Testimonials`, `ReviewCard`, `PricingTable`) already exist — CONV-02 is *placement above the fold*, not new components. The llms.txt leak fix reuses the Phase 2 `site.canonicalUrl` (I-01) and `getStoreConfig()`.

**Not in scope (other phases):** Cross-tenant correctness audit (Phase 6 / verifies what this phase emits). Off-site link-building / GBP profile creation (marketing-ops, deferred). No new service types (4-service catalog fixed). No ES locale (deferred v2). GA4-console channel-group setup and the Perplexity custom-channel regex are **manual GA4-admin UAT steps**, not code deliverables.

</domain>

<decisions>
## Implementation Decisions

### AI-Discovery Layer / llms.txt (LLMS-01, LLMS-02)
- **L-01 — Leak fix is locked, not a gray area:** the `src/app/llms.txt/route.ts` blockquote + "directions to Carrefour Beauport" page descriptions are a cross-tenant leak. ALL prose/facts come from the resolved tenant config — zero hardcoded city/landmark strings. Non-negotiable.
- **L-02 — Use canonical host, not `site.url`:** llms.txt links derive from `site.canonicalUrl` (the stable I-01 production origin), consistent with the Phase 2 `@id` scheme — not the runtime `site.url`.
- **L-03 — Generated facts + hand-authored prose split:** the **facts** (4 services with CAD price ranges, opening hours, booking path) are generated from `getStoreConfig()` so they never drift; the **intro paragraph** is a new hand-authored per-tenant `site.llmsDescription` field (replaces the leaked blockquote) — the differentiator that pushes each tenant past >200 unique words.
- **L-04 — Include the Phase-4 pages:** llms.txt links the net-new pricing (`/tarifs`), 4 comparison pages, and the borough near-me page — the buying-guide surfaces AI engines cite.
- **L-05 — FR canonical + EN equivalents:** lead with FR default-locale canonical pages, then a short "English equivalents" section linking the EN routes (bilingual coverage).
- **L-06 — Depth content scope (confirmed):** service list + price ranges (generated), hours + booking path (generated), Phase-4 page links, hand-authored intro prose — all four.

### Measurement / GA4 (MEAS-01)
- **M-01 — Per-tenant GA4 property:** each salon has its own GA4 property; the measurement ID is a **per-tenant config field** (resolved via `getStoreConfig()`, like NAP). Clean separate reporting + ownership. A missing ID = that tenant has no analytics (guardable — see N-02/cross-cutting).
- **M-02 — Consent Mode v2, denied-by-default (Québec Law 25):** GA4 loads but sends cookieless pings until the user consents via a **lightweight consent banner** (net-new component); flips to full tracking on accept via `gtag('consent', 'update', ...)`. Law-25 defensible while retaining pre-consent signal.
- **M-03 — Conversion events (4, confirmed):** track **call click (tel:)**, **book-online click**, **contact form submit**, **directions click**. Booking completion is inside a third-party iframe (cross-origin) → only the *click/intent* is trackable, not completion.
- **M-04 — Primary key event:** **book-online click** is the primary GA4 key event (conversion); the other three are tracked as secondary events.

### Measurement / Core Web Vitals (MEAS-02)
- **M-05 — web-vitals → GA4 events:** wire `web-vitals@5.3.0` (`onINP` + onLCP/onCLS/etc.) to report real-user metrics as GA4 events. Reporting destination is the same per-tenant GA4 property (ties to M-01). Verification target: real-user INP P75 visible in GA4.

### Conversion Surfaces (CONV-01, CONV-02)
- **C-01 — Keep FloatingCTA pill, verify + instrument:** the existing bottom-right book+phone pill (already site-wide in `layout.tsx`) stays. This phase verifies it's visible above the fold/keyboard on mobile across key pages and wires its clicks into the M-03 conversion events. No new sticky-bar component.
- **C-02 — Above-fold signals (3, confirmed):** **star rating + review count** (only when the R-02 gate passes — ≥5 reviews, fresh fetch), **years-experience badge** (15+ years, always available), **price-from anchor** ("à partir de $X" / "from $X", linking to the pricing page; price-from is allowed under D-29 qualitative-pricing).
- **C-03 — Target pages (confirmed):** home, service detail (`/services/[slug]`), pricing (`/tarifs`·`/pricing`), and the comparison + near-me Phase-4 pages. Home/service/pricing are primary; comparison+near-me get the lighter treatment.

### NAP Consistency (LOCAL-01)
- **N-01 — Single config source-of-truth + guard:** on-site NAP consistency is structurally guaranteed by resolving every surface from `getStoreConfig()` (no duplicated NAP literals). Add a guard/test asserting name/address/phone/hours are identical across the surfaces that render them (footer, contact, locations, llms.txt, JSON-LD, schema `@id` location node) per tenant.
- **N-02 — External-alignment reference:** produce a documented per-tenant NAP reference (the canonical name/address/phone/hours string set) so a human can align GBP/directory profiles. Off-site profile *creation* stays out of scope (marketing-ops).

### Claude's Discretion (left to research / planning)
- Exact GA4 loading mechanism (Next.js `<Script>` strategy, `next/third-parties` GA helper vs hand-rolled gtag) and where the consent-banner component mounts.
- Consent-banner UX (copy, persistence via cookie/localStorage, FR/EN strings) — within the M-02 Consent-Mode-v2 contract.
- The per-tenant config field names for `llmsDescription` and the GA4 measurement ID, and their completeness-guard wiring into `next.config.ts` / `schema-invariants.ts`.
- llms.txt section ordering/formatting within L-03/L-06 (markdown structure, how EN equivalents are grouped).
- Whether the leak guard is a new test or extends an existing one; how it asserts "no other tenant's city/landmark appears in a tenant's llms.txt body".
- Event-payload shape for GA4 conversion events (event names, params) and whether web-vitals events reuse the same gtag.
- Exact above-the-fold placement/markup for the C-02 signals on each page (hero composition).
- The form/format of the N-02 NAP reference artifact (generated doc vs config-derived table).
- Native AI-Assistant channel reliance vs the manual Perplexity-regex custom channel (GA4-admin step) — code emits the referrer-carrying traffic; channel grouping is console config.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 5: llms.txt Depth + Measurement" — goal + 7 success criteria (the verification target)
- `.planning/REQUIREMENTS.md` — LLMS-01 (per-tenant llms facts), LLMS-02 (deepened llms content), LOCAL-01 (NAP consistency + external-alignment doc), CONV-01 (mobile sticky CTA), CONV-02 (above-fold trust + price), MEAS-01 (GA4 AI-referrer + conversion events), MEAS-02 (web-vitals INP/CWV)
- `.planning/phases/02-schema-completeness-correctness/02-CONTEXT.md` — I-01 stable canonical `@id` host (`site.canonicalUrl`, L-02 reuses), R-02 review-suppression gate (C-02 star rating gated on it)
- `.planning/phases/04-net-new-pages/04-CONTEXT.md` — the net-new pricing/comparison/near-me routes that L-04 links and C-03 decorates; D-29 qualitative-pricing rule (C-02 price-from is compliant)
- `.planning/PROJECT.md` §Constraints — multi-tenant (resolve via `getStoreConfig()`/`resolveTenant()`, never hardcode tenant data), `force-dynamic` mandate, Dokploy webhook deploy, FR/EN silent-undefined parity risk
- `.planning/STATE.md` §Accumulated Context — `next.config.ts` is the build guard; `web-vitals@5.3.0` approved, `@vercel/speed-insights` / `next-seo` rejected; JSON-LD stays pure in `src/lib/seo.ts`

### Code to create / modify
- `src/app/llms.txt/route.ts` — **fix the leak** (L-01): replace hardcoded "Carrefour Beauport" prose with config-resolved facts + `site.llmsDescription`; use `site.canonicalUrl` (L-02); add Phase-4 page links (L-04) + EN equivalents (L-05)
- `src/config/types.ts` (`TenantSite`) — **NEW** fields: `llmsDescription` (hand-authored intro, L-03) and the GA4 measurement ID (M-01)
- `src/config/tenants/{id}/site.ts` — populate `llmsDescription` + GA4 ID per tenant
- `src/app/[lang]/layout.tsx` — GA4 `<Script>` + Consent Mode v2 init + consent banner mount (M-01/M-02); `FloatingCTA` already mounted here (C-01)
- **NEW** consent-banner component + a GA4/gtag client helper (M-02) — location per discretion
- **NEW** web-vitals reporter (client) wiring `onINP`/CWV → gtag events (M-05)
- `src/components/FloatingCTA.tsx` — add click instrumentation for call + book events (C-01/M-03)
- `src/components/ContactForm.tsx` — form-submit conversion event (M-03)
- Home / `src/app/[lang]/services/[slug]` / pricing / comparison / near-me pages — above-fold trust + price-anchor placement (C-02/C-03)
- `src/config/schema-invariants.ts` (+ `next.config.ts` wiring) — completeness guards: `llmsDescription` present + >200 words per tenant, GA4 ID present per tenant, NAP-consistency assertion (N-01), no-cross-tenant-leak in llms.txt body

### Codebase constraints / reference
- `src/lib/seo.ts` — `site.canonicalUrl` → `@id` scheme (L-02 mirrors); `Service` price/priceTo for the price-from anchor (C-02)
- `src/lib/store-config.ts` / `getStoreConfig()` — the tenant-resolution entry every surface uses (L-01, M-01, N-01)
- `src/config/index.ts` — `TENANT_REGISTRY` (guards/tests iterate)
- `src/components/{Stars,WhyChooseUs,Testimonials,ReviewCard,PricingTable}.tsx` — existing trust/price components C-02 places above the fold
- `node_modules/next/dist/docs/` — Next.js 16.2.6 is non-standard; read before writing `<Script>`/route/build-hook code

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`FloatingCTA` (already site-wide in `layout.tsx`)** — CONV-01 reuses it; only adds mobile-visibility verification + click instrumentation (C-01).
- **`getStoreConfig()` + per-tenant `site.*`** — the single resolution path for the llms.txt leak fix, GA4 ID, and NAP consistency (L-01/M-01/N-01).
- **`site.canonicalUrl` (Phase 2 I-01)** — the stable host the deepened llms.txt links must use (L-02).
- **Trust/price components** (`Stars`, `WhyChooseUs`, `Testimonials`, `ReviewCard`, `PricingTable`) — CONV-02 raw material; already imported on the home page.
- **`schema-invariants.ts` + `next.config.ts` build gate** — the proven block-the-build mechanism; new completeness/leak/NAP guards extend it (carries C-02-era pattern).
- **R-02 review-suppression gate** — gates the C-02 star-rating signal (only shows with ≥5 fresh reviews).

### Established Patterns
- Content/facts resolved per-tenant at render (`force-dynamic`); never hardcode tenant data — the leak (L-01) is the counter-example being corrected.
- Net-new per-tenant config fields land in `TenantSite` (`src/config/types.ts`) + each tenant's `site.ts`, with a completeness guard.
- Client-only concerns (GA4 gtag, consent banner, web-vitals) are net-new and must be `'use client'` islands; pages stay server components.

### Integration Points
- **`layout.tsx`** — single mount point for GA4 script, Consent Mode init, consent banner, and the existing FloatingCTA.
- **`llms.txt/route.ts`** — currently `site.url` + hardcoded prose; rewires to `site.canonicalUrl` + config facts + `llmsDescription`.
- **Build guard** — `schema-invariants.ts` iterates `TENANT_REGISTRY`; new asserts (llms depth, GA4-ID presence, NAP consistency, no-leak) hook the same wiring.
- **Conversion events** — `FloatingCTA`, `ContactForm`, and directions/map links emit the M-03 gtag events.

</code_context>

<specifics>
## Specific Ideas

- The leak is concrete: `route.ts` line — blockquote "Professional nail salon at Carrefour Beauport, Québec City…" and "[Location](…): map and directions to **Carrefour Beauport**" — both wrong for charlesbourg (Carrefour Charlesbourg) and rivieres (Centre Les Rivières, Trois-Rivières).
- Booking is a third-party embed → GA4 sees the click, never the completion. Track intent, report it honestly.
- Québec Law 25 (in force Sept 2023) drives the consent decision — this is a Québec business, so Consent Mode v2 denied-by-default is the defensible default, not "load GA4 unconditionally".
- Per-tenant GA4 property = each salon owner can be granted access to *their* property without seeing the others — the multi-tenant rationale.
- "Answer-first / quotable" carries into llms.txt: the `llmsDescription` intro is the line an AI engine quotes — it must stand alone per tenant.

</specifics>

<deferred>
## Deferred Ideas

- **GBP / external directory profile creation + off-site link-building** — marketing-ops, out of scope; LOCAL-01 only *documents* the canonical NAP for alignment (N-02), doesn't create profiles.
- **Full-width mobile sticky CTA bar** (replacing/augmenting the FloatingCTA pill) — considered, rejected this phase in favor of keeping the existing pill (C-01); candidate if conversion data later justifies it.
- **Tracking booking completion inside the third-party widget** — not possible cross-origin without provider support; deferred pending a provider postMessage/callback.
- **Server-side / Measurement Protocol conversion tracking** — client gtag events only this phase; server-side enrichment is a later candidate.
- **ES-locale llms.txt / pages** — fr/en only (carries D-25); deferred v2.
- **Per-service web-vitals attribution or RUM dashboards beyond GA4** — GA4 events only; dedicated RUM tooling deferred.

</deferred>

---

*Phase: 5-llms.txt Depth + Measurement*
*Context gathered: 2026-06-19*
