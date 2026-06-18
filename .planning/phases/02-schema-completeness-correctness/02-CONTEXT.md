# Phase 2: Schema Completeness + Correctness - Context

**Gathered:** 2026-06-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Every tenant emits **valid, typed, complete JSON-LD** across all six required schema types — LocalBusiness/`NailSalon`, Service + AggregateOffer, FAQPage, Review/AggregateRating, BreadcrumbList, Organization — on the **existing `src/lib/seo.ts` builder boundary**. Review schema is guarded against stub data, and tests enforce both `schema-dts` typing and FR/EN parity, wired into the build guard.

**Brownfield reality (important):** This is mostly **correctness deltas, not greenfield emission.** All six builders already exist in `src/lib/seo.ts`, breadcrumb is already rendered on 10+ sub-pages, and `src/config/seo/seo-parity.test.ts` already enforces FR/EN parity across base + all three tenants. The work is fixing the specific gaps below — not rebuilding scaffolding.

**In scope:** review-schema placement/suppression fix, per-tenant review data, `schema-dts` + a validator lib in tests wired into the `next.config.ts` build guard, a stable per-tenant `@id` scheme, FAQ completeness + dictionary-parity guards, and a distinct brand `Organization` node.

**Not in scope (other phases):** content/answer blocks + FAQ *depth* (Phase 3 — this phase guards completeness/parity, Phase 3 adds the content), net-new pages (Phase 4), llms.txt depth + GA4 measurement (Phase 5), the cross-tenant correctness audit (Phase 6). No new service types; the 4-service catalog and per-tenant pricing from Phase 1 are fixed inputs.

</domain>

<decisions>
## Implementation Decisions

### Review / AggregateRating (SCHEMA-04)
- **R-01:** AggregateRating lives on the **business node** (the `NailSalon`). Service nodes carry it **by link only** — they keep `provider: { @id: <business> }` (already present) so engines resolve the rating via the linked provider. **Do NOT copy the rating value onto Service nodes** — copying a salon-wide number onto each service asserts per-service ratings that don't exist (review-spam manual-action risk).
- **R-02:** Suppress AggregateRating entirely when **there is no fresh fetch (`fetchedAt` null) OR `reviewCount < 5`**. It appears only when real data clears both gates.
- **R-03:** **Review data is per-tenant.** The current split-brain (gate read from the *global* `src/data/google-reviews.json`, values from per-tenant `site.reviews`) is a multi-tenant bug — as written, all tenants would share one rating. Make the review source per-tenant. Exact location (per-tenant `google-reviews.json` under `src/config/tenants/{id}/` vs. a per-tenant config field, and how `fetch:reviews` / `@/lib/reviews` resolve tenants) is **left to research/planning** — only the per-tenant principle + R-01/R-02 rules are locked.
- **R-04 (requirement reconciliation):** SCHEMA-04's literal wording ("nested under Service") is satisfied **by-equivalent** via R-01 (business-node rating + Service `provider` link). Update the requirement note to reflect this — do not emit duplicated per-service ratings to satisfy the literal phrasing.

### CI Validity Enforcement (SCHEMA-06)
- **C-01:** Add **`schema-dts@2.0.0` (dev)** typing to every builder in `src/lib/seo.ts` (compile-time, zero runtime cost — already approved in STATE.md), **PLUS a JSON-LD / schema.org validator library** used in `bun:test` to assert true schema.org validity per tenant. The specific validator lib is **left to research** (must run offline, no network).
- **C-02:** Schema **validity + the existing FR/EN parity test BLOCK the build** — wired into the **`next.config.ts` build guard** (the same mechanism Phase 1 used for config completeness). Invalid schema or a parity gap aborts the build and the Dokploy deploy. This is the strong gate given there is no GitHub-Actions CI before deploy.
- **C-03 (manual boundary):** Google Rich Results Test (ROADMAP success criteria 1–2) is a **network/manual UAT step**, not automatable offline. The offline gate (C-01/C-02) is the structural/typing proxy; RRT pass is verified manually during UAT.

### Per-Tenant Schema Identity (SCHEMA-01)
- **I-01:** The `@id` is **decoupled from the runtime `site.url`** and uses a **stable, resolvable canonical-URL form** — `https://{canonical-host}/#business` (and `#location-{id}`, `#organization`). Resolvable URL is Google-preferred over an opaque `urn:`. The fixed per-tenant identity base (a new config field vs. a confirmed-stable production host) is **left to planning**; the decoupling + resolvable-URL requirement is locked.
- **I-02:** Add an **`@id`-uniqueness assertion across all `TENANT_REGISTRY` tenants** to the Area-2 validator/shape test — no cross-tenant `@id` collision (one Docker image, `TENANT`-selected).
- **I-03:** Omit `sameAs` **entirely** (never `sameAs: []`) and any GBP `@id` linkage when a tenant has no Google Business Profile — carries forward Phase 1's D-07 (Maps CID required-if-exists; schema must omit cleanly).

### FAQ Completeness (SCHEMA-03)
- **F-01:** A `bun:test` asserts **FAQPage `mainEntity` length === FAQ-entry count in `dictionaries/{locale}.json`**, per tenant per locale, with each `q`/`a` non-empty — guarantees no FAQ item is silently dropped from schema.
- **F-02:** **Extend the FR/EN parity guard to the FAQ section of `dictionaries/{en,fr}.json` now** (Phase 2), so Phase 3's FAQ deepening (CONTENT-02) is drift-protected from day one. Both F-01 and F-02 feed the build guard (C-02). Note: the existing `seo-parity.test.ts` covers `seo.{locale}.json`; the FAQ content lives in the separate `dictionaries/` files — this adds that coverage.

### Breadcrumb + Organization (SCHEMA-05)
- **O-01:** Add a **distinct top-level brand `Organization` node** with its own stable canonical `@id` (`#organization`, consistent with I-01). Each `NailSalon` location references it via `parentOrganization`. (Chosen over NailSalon-as-Organization for a cleaner brand entity / multi-location signal.)
- **O-02:** **Verify `breadcrumbGraph` renders on every indexable sub-page** and close any gaps. Coverage is already broad (contact, faq, locations, services, services/[slug], about, reviews, gallery, book-online, privacy, terms); home/root needs none.

### Claude's Discretion (left to research/planning)
- Exact per-tenant review-data location + tenant resolution (R-03); the specific offline JSON-LD validator library (C-01); the canonical-host identity field vs. reused production host (I-01); SCHEMA-02 single-price handling (current `offer()` emits `AggregateOffer` when `priceTo > price` else plain `Offer` — this is correct as-is and not a locked decision).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 2: Schema Completeness + Correctness" — goal + 5 success criteria (the verification target)
- `.planning/REQUIREMENTS.md` — SCHEMA-01 (LocalBusiness `@id`), SCHEMA-02 (Service/AggregateOffer), SCHEMA-03 (FAQPage), SCHEMA-04 (Review guard), SCHEMA-05 (Breadcrumb + Organization), SCHEMA-06 (schema-dts typing + parity CI)
- `.planning/phases/01-per-tenant-config-completion/01-CONTEXT.md` — Phase 1 decisions that feed schema: D-04/D-05 (identical 4-service catalog, per-tenant prices), D-07 (Maps CID required-if-exists, clean omit)

### Code to modify / extend (the builder boundary)
- `src/lib/seo.ts` — ALL JSON-LD builders: `organizationGraph`, `serviceGraph`/`servicesGraph`, `faqPageGraph`, `breadcrumbGraph`, `offer()`, `imageGalleryGraph`. AggregateRating currently on the business node gated on `reviewsFetchedAt`; `@id` derives from `site.url`; `sameAs: cfg.site.socialProfiles` unconditional. This is where R-01/R-02, I-01/I-03, O-01, and C-01 typing land.
- `src/config/seo/seo-parity.test.ts` — existing FR/EN parity guard (base + maily + charlesbourg + rivieres). Extend per F-02; SCHEMA-05 criterion 5 is **already met** by this file.
- `src/data/google-reviews.json` — current global review stub (`fetchedAt: null`, aggregate 0/0). R-03 makes this per-tenant.
- `src/components/JsonLd.tsx` — the server-rendered `<script type="application/ld+json">` injector (no change expected; reference for how data reaches the page).
- `src/app/[lang]/layout.tsx` — renders `organizationGraph` (home/business + Organization node lands here per O-01).
- `src/dictionaries/{en,fr}.json` — FAQ source for F-01/F-02 (note: FAQ lives here, not in `seo.{locale}.json`).

### Codebase constraints
- `.planning/PROJECT.md` §Constraints — multi-tenant (never hardcode tenant data; resolve via `getStoreConfig()`/`resolveTenant()`), `force-dynamic` mandate, Dokploy webhook deploy, FR/EN locale parity (silent-undefined risk)
- `.planning/STATE.md` §Accumulated Context — JSON-LD stays in `src/lib/seo.ts` as pure functions; `next.config.ts` is the build guard (C-02 extends it); `schema-dts@2.0.0` + `web-vitals@5.3.0` approved, `next-seo`/`@vercel/speed-insights` rejected
- `src/config/index.ts` — `TENANT_REGISTRY` (the authoritative tenant list the validator/uniqueness test iterates)
- `src/config/types.ts` — `Service` (price/priceTo), `Location`, `TenantSite` (geo/hours/socialProfiles/reviews) contracts the schema reads
- `node_modules/next/dist/docs/` — Next.js 16.2.6 is non-standard; read before writing Next.js/build-hook code

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/lib/seo.ts`** — all six builders already exist and are pure functions. Extend, don't rebuild. `offer()` already emits `AggregateOffer` when `priceTo > price` else plain `Offer` (SCHEMA-02 correct as-is).
- **`src/config/seo/seo-parity.test.ts`** — proven recursive key-path parity test across base + all 3 tenants. SCHEMA-05 criterion 5 already satisfied; F-02 extends the same pattern to FAQ dictionaries.
- **bun:test convention** — `src/*.test.ts`, run via `bun test src/`. New schema validity / FAQ-count / `@id`-uniqueness tests fit here.
- **`next.config.ts` build guard (Phase 1)** — the established block-the-build mechanism; C-02 wires schema validity + parity into it.

### Established Patterns
- JSON-LD is server-rendered via `<JsonLd data={...} />`; data always comes from `src/lib/seo.ts` builders, never inlined in pages.
- `organizationGraph` emits a `@graph` with a top `NailSalon` business node (`@id` = `BUSINESS_ID`), per-location `NailSalon` departments (`parentOrganization` → business `@id`), AggregateRating, and a `WebSite` node. O-01 inserts a brand `Organization` above this.
- Hours carry dual representation (human `hours[]` + schema `hoursSpec[]` / `OpeningHoursSpecification`).

### Integration Points
- **Review data resolution** — `reviewsFetchedAt` comes from `@/lib/reviews` (reads the global `google-reviews.json`); rating values come from per-tenant `site.reviews`. R-03 unifies these per-tenant; confirm how `@/lib/reviews` + the `fetch:reviews` script resolve a tenant.
- **Build guard wiring** — C-02 extends the Phase-1 `next.config.ts` guard; reuse its structure rather than adding a separate `prebuild` script.
- **`@id` base** — currently `${cfg.site.url}/#business`; I-01 swaps the base for a stable canonical host. Confirm whether a per-tenant canonical field exists or must be added to `TenantSite`.

</code_context>

<specifics>
## Specific Ideas

- The Rich Results Test is the human-facing proof for criteria 1–2 — run it per tenant in UAT once builders are typed/validated; the offline gate is the structural proxy, not a replacement.
- Penalty-risk framing drove R-01: a salon has ONE Google rating, so it belongs on the one business node; Service nodes inherit it through `provider`, never by value copy.
- F-02 is deliberately pulled forward from Phase 3 because it's a cheap test that protects Phase 3's content additions from FR/EN drift the moment they land.

</specifics>

<deferred>
## Deferred Ideas

- **SCHEMA-02 single-price → AggregateOffer coercion** — not changing; current `offer()` behavior (plain `Offer` for single price) is correct. Noted only so planning doesn't "fix" it.
- **FAQ content depth** (more Q&A pairs) — Phase 3 / CONTENT-02. Phase 2 only guards completeness + parity of what exists.
- **Automated/monitored Google reviews fetch** — beyond per-tenant data plumbing; the live-fetch automation is a post-milestone concern. Phase 2 handles the per-tenant *source* + suppression gate only.
- **Per-location independent ratings** — out of scope; we model one salon-wide rating linked from services (R-01).

</deferred>

---

*Phase: 2-Schema Completeness + Correctness*
*Context gathered: 2026-06-18*
