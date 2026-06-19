# Phase 3: Content Depth - Context

**Gathered:** 2026-06-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Key pages (home, services index, every `services/[slug]`, locations index) **lead with a self-contained direct-answer block** (≥2 sentences, factual-first) rendered **before any marketing copy**, and **FAQ content deepens from ~11 to ≥20 Q&A pairs per tenant** — with **FR/EN parity AND multi-tenant correctness** enforced. Goal: maximize AI-citation retrieval (ChatGPT/Perplexity/Claude/Gemini) and long-tail coverage for every tenant.

Maps to **CONTENT-01** (direct-answer blocks) and **CONTENT-02** (deepened FAQ, locale parity).

**Brownfield reality:** Per-tenant facts already flow to pages via `getStoreConfig()` (NAP/hours/services/pricing) + `getSeo()` (per-tenant `seo.{locale}.json`); UI/FAQ strings come from the global `getDictionary()`. Phase 2 already guards FAQ completeness (F-01) and FR/EN parity (F-02) on the **global** dictionary. Phase 3 adds the *content* and reshapes FAQ to be per-tenant-correct.

**Critical defect this phase fixes:** `src/dictionaries/{en,fr}.json → faq.items` is **global but hardcodes ongles-maily facts** (e.g. item #1 *"Where is Ongles Maily located? … Carrefour Beauport…"*). charlesbourg/rivieres currently render another tenant's FAQ. Phase 2's parity guard is blind to *tenant* correctness — closing that gap is in scope here.

**Not in scope (other phases):** net-new page types — pricing, comparison, near-me (Phase 4 / PAGE-01/02/03); llms.txt depth + GA4 AI-referrer + web-vitals (Phase 5); sticky/above-fold CTA hardening (Phase 5 / CONV-01/02); cross-tenant correctness audit (Phase 6). No new service types (4-service catalog fixed). Page-scoped FAQ on service/location pages is **deferred** (see Deferred Ideas).

</domain>

<decisions>
## Implementation Decisions

### FAQ Architecture (CONTENT-02)
- **D-01 — Hybrid scope:** FAQ = a **shared generic base** in `src/dictionaries/{en,fr}.json` (`faq.items`, tenant-agnostic) **+ a per-tenant layer**. Both feed the FAQPage schema and the `/faq` render.
- **D-02 — Per-tenant layer location:** new files `src/config/tenants/{id}/faq.fr.json` + `faq.en.json` (mirrors the existing per-tenant `seo.{locale}.json` pattern), merged with the shared base at render.
- **D-03 — Migrate + de-tenant the base:** relocate the ~4–5 tenant-specific current items (location, hours, walk-in/booking, services-offered) **out** of the global base into each tenant's `faq.{locale}.json` with **real per-tenant facts**; rewrite the ~6–7 generic items (hygiene, payment, languages, fills, gift cards, satisfaction) to **drop the "Ongles Maily" brand name** so the shared base is truly tenant-agnostic. This eliminates the cross-tenant FAQ correctness defect.
- **D-04 — Depth target:** ≥20 Q&A pairs per tenant per locale (base + tenant union). Add ~9+ new items drawn from **all four topic clusters**: Pricing & money, Service specifics, Visit logistics, Health & trust.
- **D-05 — Hard build-guard floor:** extend the `src/config/schema-invariants.ts` guard (wired into the `next.config.ts` build gate) to assert **(base + tenant) FAQ count ≥ 20 per tenant per locale**; build/deploy **fails** on shortfall. Store `20` as a named constant. **F-01** (FAQPage `mainEntity` count == FAQ-entry count) and **F-02** (FR/EN parity) extend to cover the **base+tenant union**.
- **D-06 — Merge order:** the union interleaves by **intent priority** (location → hours → booking → pricing → services → trust/logistics), **not** base-then-tenant-appended. High-intent tenant facts lead.
- **D-07 — FAQ answer length norm:** 1–3 short sentences (~40–60 words), answer-first. **Soft guideline** (not a hard build gate, unlike the block min).

### Answer Blocks (CONTENT-01)
- **D-08 — Authoring source:** answer-block copy is **hand-written per-tenant in `seo.{locale}.json`**, as a **distinct new field** — NOT derived from `meta.*` (the ~160-char SERP description stays separate from the on-page citable block).
- **D-09 — Coverage:** home + services index + **every `services/[slug]`** + locations index, per tenant per locale. **Note:** there is **no per-location detail route** (locations is a single index page rendering all locations). The "location" answer block lands on the locations index; if per-location blocks are wanted they become sections within that index — **planning to reconcile** with the "per location detail" wording.
- **D-10 — Field nesting:** per-service blocks nest under the existing `seo.{locale}.json → services` entries (keyed by slug — slugs confirmed: `pose-ongles`, `remplissage`, `soins-mains`, `soins-pieds`); per-location blocks nest under the locations structure similarly.
- **D-11 — Build-guard completeness + min length:** extend `schema-invariants.ts`: every required route has a **non-empty answerBlock with ≥2 sentences** per tenant per locale, else build/deploy fails. Keys also covered by the FR/EN parity guard.
- **D-12 — Length ceiling:** 2–4 sentences / ~60 words max. *(Hard-vs-soft enforcement of the ceiling → Claude's Discretion.)*
- **D-14 — Canonical question per page type** (authors + AI target one intent): home = *"what/where is {salon} + services in {city}?"*; services index = *"what services + price range?"*; service detail = *"what is {service}, price, duration?"*; locations index = *"where are the salons + how to book?"*.
- **D-15 — Replace existing intro:** the block **replaces** the existing dictionary intro copy (`home.intro`, `servicesPage.intro`, etc.) — single lead per page. Audit + retire old intros (no stacked double-intros).
- **D-16 — Pure info + ≤1 inline link:** block stays a clean citable fact with at most one inline link (booking/relevant page per D-27); **no CTA button chrome** inside the block (conversion handled by hero CTA + Phase 5 sticky CTA).

### Placement & Rendering
- **D-17 — Position:** answer block renders **first in `<main>`, above the hero** (strongest source-order signal; literally "before any marketing copy").
- **D-18 — Component:** one shared **`<AnswerBlock>` server component**, rendering **visible, crawlable prose** (real `<p>`, in the accessibility tree — never hidden / `aria-hidden`).
- **D-19 — Heading:** the **block carries the page `<h1>`**; the hero heading demotes to `<h2>`/visual-only. Preserve exactly **one `<h1>` per page**; audit current per-page heading levels.
- **D-20 — LCP:** hero image stays **priority/eager** (text paints first with no image dependency, hero image LCP unchanged → no CWV regression vs today).

### Content Style & Locale
- **D-21 — FR register:** **vous** (formal). FR is **source-of-truth**, authored first.
- **D-22 — Sentence style:** short, factual, **answer-first** sentences (~15–25 words, one fact each, stand-alone-quotable). Applies to blocks **and** FAQ answers.
- **D-23 — Voice:** **shared brand voice** across tenants; uniqueness comes from **per-tenant facts**, not tonal differences.
- **D-24 — EN quality bar:** **native-quality, idiomatic EN** (not a literal FR calque); identical factual content.
- **D-25 — Locales this phase:** **fr/en only.** No ES scaffolding (ES deferred to v2; keep ES out of the v1 ≥20 / ≥2-sentence content gates).
- **D-26 — Namespace boundary:** author new copy **only** in `seo.{locale}.json` + `dictionaries/{en,fr}.json` + per-tenant `faq.{locale}.json`. **Do NOT** add to legacy `content.{locale}.json` (in migration, folded by `legacy-seo-shim.ts`).

### Cross-cutting Consistency
- **D-27 — Block↔FAQ overlap:** factual overlap is **allowed** (AI rewards reinforcement) but **vary the wording** — no verbatim on-page duplication; each surface independently citable.
- **D-28 — Block↔schema alignment:** answer-block facts **align** with Phase 2 JSON-LD entity descriptions (service block ↔ `Service`, home block ↔ `NailSalon`) **by authoring discipline, NOT code coupling** — Phase 2 builders in `src/lib/seo.ts` stay untouched.
- **D-29 — Pricing in copy:** **qualitative ranges only** ("from around $X", "budget-friendly fills"); **no hardcoded exact prices** in prose (drift risk). Phase 4 pricing page + JSON-LD own exact numbers.
- **D-30 — FAQ link/schema split:** FAQ rendered answers may carry inline links (D-16/D-27), but **FAQPage `acceptedAnswer.text` must stay clean plain text** — mechanism to keep schema text link-free is a planning concern.

### Claude's Discretion (left to research/planning)
- **D-13 — Sentence/word-count detection method** for the ≥2-sentence / ~60-word gate: rule is locked; the robust **offline** detection (split on `.!?` with guards for postal codes like `G1C 5R9`, abbreviations, decimals) is left to research.
- Hard-vs-soft enforcement of the block length ceiling (D-12).
- Exact loader/merge wiring for per-tenant `faq.{locale}.json` (how the new loader composes with `getDictionary()` / `src/lib/dictionary.ts`).
- Exact distribution of the ~9 new FAQ items between shared base vs per-tenant layer, per cluster.
- Test-file layout for the new guards (extend `schema-invariants.test.ts` / `seo-parity.test.ts` vs new files).
- Reconciling D-09 "location detail" with the single locations index route (per-location sections vs index-level block).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 3: Content Depth" — goal + 3 success criteria (verification target)
- `.planning/REQUIREMENTS.md` — CONTENT-01 (direct-answer blocks), CONTENT-02 (deepened FAQ, identical locale keys)
- `.planning/phases/02-schema-completeness-correctness/02-CONTEXT.md` — F-01 (FAQPage count == dict count) and F-02 (FR/EN FAQ parity) — Phase 3 extends both to the base+tenant union
- `.planning/PROJECT.md` §Constraints — multi-tenant (never hardcode tenant data; resolve via `getStoreConfig()`/`resolveTenant()`), `force-dynamic` mandate, FR/EN parity silent-undefined risk, Dokploy webhook deploy
- `.planning/STATE.md` §Accumulated Context — JSON-LD stays in `src/lib/seo.ts` (D-28 keeps it untouched); `next.config.ts` is the build guard (D-05/D-11 extend it)

### Code to modify / extend
- `src/dictionaries/{en,fr}.json` — `faq.items` shared base (de-tenant per D-03); existing `home.intro`/`servicesPage.intro` intros (replaced per D-15)
- `src/config/tenants/{id}/faq.{locale}.json` — **NEW** per-tenant FAQ layer (D-02)
- `src/config/tenants/{id}/seo.{locale}.json` — per-tenant answer-block field, nested under `services`/locations entries (D-08/D-10)
- `src/config/schema-invariants.ts` (+ `schema-invariants.test.ts`) — F-01/F-02 home; add ≥20 FAQ floor (D-05) + answer-block presence/length guard (D-11)
- `src/config/seo/seo-parity.test.ts` — extend parity to FAQ union + answerBlock keys
- `src/app/[lang]/page.tsx`, `services/page.tsx`, `services/[slug]/page.tsx`, `locations/page.tsx` — answer-block placement (D-17), h1 reshuffle (D-19)
- `src/components/` — **NEW** `<AnswerBlock>` shared server component (D-18)
- `src/app/[lang]/dictionaries.ts` + `src/lib/dictionary.ts` — dictionary load; per-tenant FAQ merge wiring (D-02 loader)
- `src/app/[lang]/faq/` — FAQ page render (consumes base+tenant union, intent-ordered per D-06)

### Codebase constraints / reference
- `src/config/types.ts` — `Service`, `Location`, `TenantSite`, `Locale` (`fr|en|es`) contracts
- `src/config/index.ts` — `TENANT_REGISTRY` (authoritative tenant list the guards iterate)
- `src/app/[lang]/legacy-seo-shim.ts` — legacy `content` namespace folding (D-26: do not grow legacy files)
- `node_modules/next/dist/docs/` — Next.js 16.2.6 is non-standard; read before writing Next.js/build-hook code

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Per-tenant `seo.{locale}.json` pattern** — answer blocks reuse this proven per-tenant content layer (loaded via `getSeo()`); `seo.services` already keyed by slug, ready for nested block fields (D-10).
- **`schema-invariants.ts` + `next.config.ts` build guard** — Phase 2's established block-the-build mechanism; D-05/D-11 extend it rather than adding a new prebuild step.
- **`seo-parity.test.ts`** — recursive key-path parity across base + 3 tenants; extends to the FAQ union + answerBlock keys.
- **bun:test convention** (`src/*.test.ts`, `bun test src/`) — new floor/presence guards fit here.

### Established Patterns
- Content sources are layered: global `getDictionary()` (UI/FAQ base) + per-tenant `getSeo()` (SEO copy) + per-tenant `getStoreConfig()` (facts). Phase 3 adds a 4th: per-tenant `faq.{locale}.json`.
- All tenant routes are `force-dynamic`; never hardcode tenant data — resolve at render.
- JSON-LD stays pure in `src/lib/seo.ts`; D-28 aligns block copy to it by discipline only.

### Integration Points
- **FAQ merge** — new per-tenant `faq.{locale}.json` must compose with the de-tenanted shared base, intent-ordered (D-06), feeding both `/faq` render and `faqPageGraph` (F-01 count stays in sync).
- **Build guard** — extend `schema-invariants.ts` for the ≥20 FAQ floor + answer-block presence/length; reuse the `next.config.ts` wiring.
- **Heading reshuffle** — block-as-h1 (D-19) requires auditing each page's current `<h1>` (likely in the hero) to avoid two h1s.

</code_context>

<specifics>
## Specific Ideas

- The existing FAQ #1 ("Where is Ongles Maily located? … Carrefour Beauport…") is the canonical example of the cross-tenant defect D-03 fixes — verify charlesbourg/rivieres no longer render maily facts after migration.
- Service slugs are French: `pose-ongles`, `remplissage`, `soins-mains`, `soins-pieds` — answer-block keys nest under these in `seo.{locale}.json`.
- "Answer-first" means the literal first sentence states the answer; detail/marketing follows. AI engines extract the lead sentence — it must stand alone if quoted.
- FAQ topic clusters to expand from: Pricing & money, Service specifics, Visit logistics, Health & trust (all four in scope, D-04).

</specifics>

<deferred>
## Deferred Ideas

- **Page-scoped FAQ on service/location pages** — surfacing route-relevant FAQ items inline beyond `/faq`. Out for Phase 3 (keeps it bounded to CONTENT-01/02); candidate for a later phase.
- **ES-locale content** — answer blocks + FAQ in Spanish. Deferred to v2 (ES-01); fr/en only this phase (D-25).
- **Exact pricing in copy** — explicit numbers live on the Phase 4 pricing page + schema, not in prose (D-29).
- **Distinct per-tenant brand voice** — considered, rejected for this phase; shared voice + per-tenant facts is the uniqueness lever (D-23).
- **Feeding schema descriptions from block text (code coupling)** — rejected; alignment by authoring discipline only (D-28).

</deferred>

---

*Phase: 3-Content Depth*
*Context gathered: 2026-06-18*
