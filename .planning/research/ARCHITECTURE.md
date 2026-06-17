# Architecture Research

**Domain:** Multi-tenant, multi-locale Next.js App Router — SEO/GEO layer
**Researched:** 2026-06-17
**Confidence:** HIGH (derived from direct codebase inspection, not speculation)

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│  CRAWL LAYER  (served at well-known paths, runtime tenant context)       │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │sitemap.ts│  │ robots.ts │  │ llms.txt/route.ts│  │ manifest.ts    │  │
│  │          │  │           │  │                  │  │                │  │
│  │getStore  │  │ getStore  │  │  getStoreConfig  │  │  (static now)  │  │
│  │Config()  │  │ Config()  │  │  + site.contact  │  │                │  │
│  └──────────┘  └───────────┘  └──────────────────┘  └────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│  SEO METADATA LAYER  ([lang]/layout.tsx + per-page generateMetadata)     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  getSeo(locale) — 3-layer merge: base / tenant JSON / Supabase  │    │
│  │  → title, description, OG, canonical, hreflang alternates        │    │
│  │  pageMetadata(lang, route, { title, description }) in lib/seo.ts │    │
│  └─────────────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────────────┤
│  JSON-LD SCHEMA LAYER  (lib/seo.ts builders → <JsonLd> component)       │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐             │
│  │organizationGra-│  │ servicesGraph /│  │ faqPageGraph / │             │
│  │ph() — emitted  │  │ serviceGraph   │  │ breadcrumbGraph│             │
│  │in layout, once │  │ per page       │  │ per page       │             │
│  │per request     │  │                │  │                │             │
│  └────────────────┘  └────────────────┘  └────────────────┘             │
├─────────────────────────────────────────────────────────────────────────┤
│  CONFIG / DATA LAYER  (runtime, force-dynamic, 60s cache)               │
│  ┌──────────────────────────┐  ┌───────────────────────────────────┐    │
│  │ getStoreConfig()         │  │ getSeo(locale)                    │    │
│  │ static tenant config     │  │ base seo.{locale}.json            │    │
│  │ + Supabase sparse merge  │  │ + tenant seo.{locale}.json        │    │
│  │ React cache + 60s        │  │ + Supabase seo override (60s)     │    │
│  │ tag: store-config:<id>   │  │ tag: store-seo:<id>               │    │
│  └──────────────────────────┘  └───────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Location |
|-----------|----------------|----------|
| `sitemap.ts` | Emit per-tenant URL list with hreflang alternates for all locales | `src/app/sitemap.ts` |
| `robots.ts` | Per-tenant host + sitemap URL; crawl rules | `src/app/robots.ts` |
| `llms.txt/route.ts` | AI-crawler manifest: NAP facts + key page links in plain text | `src/app/llms.txt/route.ts` |
| `getSeo(locale)` | 3-layer SEO text merge (base → tenant JSON → Supabase) | `src/app/[lang]/seo-content.ts` |
| `pageMetadata()` | Per-page canonical + hreflang + OG metadata fragment | `src/lib/seo.ts` |
| `organizationGraph()` | `NailSalon` + `WebSite` JSON-LD emitted once per layout render | `src/lib/seo.ts` |
| `servicesGraph()` / `serviceGraph()` | `ItemList`/`Service` + `Offer` schema per services page / service page | `src/lib/seo.ts` |
| `faqPageGraph()` | `FAQPage` schema for `/faq` | `src/lib/seo.ts` |
| `breadcrumbGraph()` | `BreadcrumbList` for sub-pages | `src/lib/seo.ts` |
| `imageGalleryGraph()` | `ImageGallery` + `ImageObject[]` for `/gallery` | `src/lib/seo.ts` |
| `<JsonLd>` | Serialise JSON-LD objects into `<script type="application/ld+json">` | `src/components/JsonLd.tsx` |
| `composeSeo()` | Deep-merge three SEO layers into `SeoDictionary` | `src/app/[lang]/compose-seo.ts` |
| `SeoDictionary` type | Type-guard: `typeof seo.en.json` — locale parity enforced structurally | `src/lib/seo-dictionary.ts` |

---

## Per-Tenant + Per-Locale Data Flow

### SEO text (titles, descriptions, alt text, org copy)

```
Request arrives at [lang]/layout.tsx or any page.tsx
    │
    ├─ getSeo(locale)                              [seo-content.ts]
    │      │
    │      ├─ base layer      src/config/seo/seo.{locale}.json
    │      ├─ tenant layer    src/config/tenants/{id}/seo.{locale}.json
    │      └─ Supabase layer  settings.seo.{locale}  (cached 60s, tag store-seo:{id})
    │             ↓ deepMerge (base → tenant → db, db wins on leaf)
    │         SeoDictionary  (typed as typeof seo.en.json — parity enforced)
    │
    └─ pageMetadata(lang, route, { title: seo.meta.homeTitle, … })
           ↓
       Metadata { title, description, alternates.canonical, alternates.languages,
                  openGraph, twitter, robots, verification, other (geo.*) }
```

### JSON-LD (schema.org structured data)

```
getStoreConfig()   →  { site, locations, services }
getSeo(locale)     →  { org.description, services.{slug}.schemaDescription, … }
    │
    ├─ organizationGraph(lang, { name, description }, { site, locations })
    │      NailSalon @id={site.url}/#business
    │      departments[] — one NailSalon per Location, linked as `department`
    │      WebSite @id={site.url}/#website
    │      → emitted ONCE in [lang]/layout.tsx (sitewide, every page)
    │
    ├─ servicesGraph(lang, items[], { site, locations })   →  /services page
    ├─ serviceGraph(lang, item, { site, locations })       →  /services/[slug]
    ├─ faqPageGraph(items[])                               →  /faq
    ├─ breadcrumbGraph(lang, crumbs[], { site, locations })→  sub-pages
    └─ imageGalleryGraph(name, images[], textFor, cfg)     →  /gallery
```

### Crawl-layer files (sitemap / robots / llms.txt)

```
sitemap.ts          →  getStoreConfig()  →  site.url (per-tenant domain)
                    →  site.routes       →  all indexable routes
                    →  services[]        →  localized service slugs
                    →  hreflang map: { fr, en, x-default } per URL

robots.ts           →  getStoreConfig()  →  site.url → host + sitemap href

llms.txt/route.ts   →  getStoreConfig()  →  site.{name, contact, url}
                    →  static page list (hardcoded in template literal)
                       ← ISSUE: key page list is hardcoded, not driven by site.routes
```

---

## Recommended Architecture for the Milestone

### 1. SEO/GEO text — centralized builders, per-tenant/per-locale JSON input

**Pattern: centralized schema builders, decentralized content.**

All `*Graph()` functions live in `src/lib/seo.ts` and accept a `SeoConfig` parameter.
Content (descriptions, FAQ text, pricing copy) lives in `seo.{locale}.json` per tenant
and optionally in Supabase. This separation is already in place and is correct.

**What to extend for the milestone:**

- Add new schema builder functions to `src/lib/seo.ts` alongside existing ones:
  `comparisonPageGraph()`, `pricingPageGraph()`, `howToGraph()` (for net-new page types).
- Add corresponding keys to `src/config/seo/seo.{locale}.json` (base) and each
  `src/config/tenants/{id}/seo.{locale}.json` (tenant override).
- Never write page-specific schema logic inside `page.tsx`. All builders live in `src/lib/seo.ts`.

### 2. Per-tenant sitemap — already correct, two gaps remain

`sitemap.ts` calls `getStoreConfig()` which reads `process.env.TENANT` at runtime.
Each container therefore emits its own sitemap scoped to its domain. This is correct.

**Gap 1:** Net-new page types (comparison, cost/pricing, knowledge-hub) must be added
to `site.routes` in each tenant's static config AND reflected in `sitemap.ts` — currently
these routes do not exist, so no action needed until the pages are built.

**Gap 2:** `llms.txt/route.ts` hardcodes the page list. Once net-new pages are added,
the llms.txt template literal must be updated per tenant (or driven by `site.routes`).

### 3. Canonical URL + hreflang strategy

**Current state (correct):**

- `metadataBase: new URL(site.url)` set once in `[lang]/layout.tsx`.
- All `alternates.canonical` and `alternates.languages` values are relative paths
  (e.g., `/fr/services`). Next.js composes them against `metadataBase`.
- `x-default` → FR locale (`locales[0]`).
- sitemap emits `alternates.languages` on every entry.

**Rule: canonical is always the locale-prefixed URL, never the bare domain root.**
`/fr` is canonical for FR homepage. `/en` is canonical for EN homepage.
This is already implemented correctly in `pageMetadata()`.

**For localized slugs (services already handled):**
`servicePathsByLocale(service)` returns per-locale paths → `localizedAlternates()` handles hreflang.
New localized routes (e.g., comparison pages with FR/EN slugs) must follow the same
`routeByLocale` pattern already in `pageMetadata()`.

### 4. Per-tenant llms.txt

**Current architecture:** single `src/app/llms.txt/route.ts` — dynamic route handler
that calls `getStoreConfig()`. Tenant is resolved at request time. This is correct.

**Gap:** The business description ("Professional nail salon at Carrefour Beauport…")
is hardcoded in the template literal, making it wrong for non-maily tenants. The fix is
to drive the description from `site.tagline` or a dedicated `site.llmsDescription` field
in each tenant's static config, not from hardcoded prose.

**Recommended structure:**

```
src/config/tenants/{id}/site.ts
  → add: llmsDescription: string   (one-paragraph factual summary for AI crawlers)
  → add: llmsPages?: string[]      (optional override of key-pages list; falls back to site.routes)
```

Then `llms.txt/route.ts` renders:
```
# {site.name}
> {site.llmsDescription}
- Address: …, Phone: …, Email: …
## Key pages
{site.llmsPages ?? site.routes} → rendered as markdown links
```

### 5. Structured facts / answer content — where it lives

| Content type | Owner | Location |
|---|---|---|
| NAP (name, address, phone) | Tenant static config | `src/config/tenants/{id}/site.ts` + `location.ts` |
| Hours | Tenant static config | `site.hours` / `loc.hoursSpec` |
| Service names, prices | Tenant static config | `src/config/tenants/{id}/services.ts` |
| Page meta titles/descriptions | SEO JSON per tenant | `seo.{locale}.json` |
| Org description (schema + llms) | SEO JSON per tenant | `seo.{locale}.json` → `org.description` |
| FAQ Q&A content | Page-level data file or SEO JSON | `seo.{locale}.json` → `faq.*` (add if not present) |
| Comparison / "best for" copy | SEO JSON per tenant | `seo.{locale}.json` → new `comparison.*` key |
| Pricing page structured copy | SEO JSON per tenant | `seo.{locale}.json` → new `pricing.*` key |
| Runtime operator overrides | Supabase `store_settings.seo` | Admin panel → cached 60s |

**Rule: factual data (NAP, hours, prices) never lives only in Supabase.** Supabase is
for operator overrides on top of static ground truth. If Supabase is down, the static
config must still produce valid structured data.

### 6. AI-referrer measurement — attachment point per tenant

GA4 measurement ID is already per-tenant (lives in `site.ga4MeasurementId` or equivalent
in static config / Supabase overrides). The referrer detection pattern is:

```
// In a Client Component analytics initializer (CustomCodeHost or dedicated component)
const AI_REFERRERS = [
  "chatgpt.com", "chat.openai.com",
  "perplexity.ai",
  "claude.ai",
  "gemini.google.com", "bard.google.com",
  "copilot.microsoft.com",
];

const ref = document.referrer;
const aiSource = AI_REFERRERS.find(r => ref.includes(r));
if (aiSource) {
  gtag("event", "ai_referral", {
    ai_source: aiSource,
    page_path: window.location.pathname,
  });
}
```

This fires once per pageload on the client. The tenant identity flows through `site.ga4MeasurementId`
already loaded into `CustomCodeHost` / the analytics init snippet. No multi-tenant leakage risk
because each container has a single TENANT and therefore a single GA4 property.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Build-time tenant baking in crawl-layer files

**What people do:** Export `export const dynamic = "force-static"` or forget `force-dynamic`
on `sitemap.ts` / `robots.ts` after a Next.js upgrade.

**Why it's wrong:** At build time `process.env.TENANT` is whatever CI set. All containers
would serve the build-tenant's sitemap/robots regardless of which brand they host.

**Do this instead:** Never set `revalidate` or `force-static` on `sitemap.ts`, `robots.ts`,
or `llms.txt/route.ts`. These files call `getStoreConfig()` and must remain force-dynamic.
Next.js App Router route handlers are dynamic by default — do not opt them into static.

### Anti-Pattern 2: Cross-tenant cache pollution in SEO output

**What people do:** Use `unstable_cache` without tenant-scoped keys (e.g., key `["store-seo"]`
instead of `["store-seo", tenant.id]`).

**Why it's wrong:** Container A warms the cache. Container B (different tenant, same Node
process in a shared-memory scenario) reads Container A's SEO data.

**Do this instead:** All `unstable_cache` calls must include `tenant.id` in the key array
AND in the `tags` array. Existing code already does this (`["store-seo", tenant.id]`,
tag `store-seo:${tenant.id}`). Every new cache site must follow the same pattern. Audit
any new `unstable_cache` additions during code review.

### Anti-Pattern 3: Hardcoded tenant facts in shared route handlers

**What people do:** Write tenant-specific prose in `llms.txt/route.ts` (already partially done —
the Carrefour Beauport description is hardcoded for ongles-maily).

**Why it's wrong:** Secondary tenants served by the same file emit wrong facts to AI crawlers.

**Do this instead:** Pull all variable prose from `getStoreConfig()` → `site.*`. Add a
`llmsDescription` field to each tenant's `site.ts`. The route handler is a pure template.

### Anti-Pattern 4: Per-page JSON-LD inline duplication

**What people do:** Inline schema.org objects directly in `page.tsx` files instead of
calling centralized builders from `src/lib/seo.ts`.

**Why it's wrong:** When NAP, URL, or price format changes, every inline block needs updating.
Schema consistency breaks across pages. Hard to test.

**Do this instead:** All schema builders in `src/lib/seo.ts`. Pages call builders with data,
never construct raw schema objects. New page types get a new builder function, not inline JSON.

### Anti-Pattern 5: Locale parity gaps in SEO JSON

**What people do:** Add a key to `seo.fr.json` for a new page type but forget `seo.en.json`.

**Why it's wrong:** `SeoDictionary = typeof seo.en.json` — the type is derived from EN.
Missing EN keys mean the type is incomplete; missing FR keys silently return `undefined`
at runtime with no compile error (FR is not the type source).

**Do this instead:** Always edit `seo.fr.json` and `seo.en.json` together. Run the existing
`src/config/seo/seo-parity.test.ts` before committing. For every new tenant, verify parity
with the same test suite.

---

## Component Boundaries

```
src/lib/seo.ts
    OWNS: all schema.org graph builders, pageMetadata(), hreflang helpers
    INPUT: locale, SeoConfig (site + locations), content strings from SeoDictionary
    OUTPUT: plain objects (schema) + Metadata fragments
    DOES NOT: read config itself — callers inject SeoConfig
    BOUNDARY: no imports from src/config/tenants/* — tenant isolation via injection

src/app/[lang]/seo-content.ts
    OWNS: 3-layer SEO merge (base / tenant JSON / Supabase) → SeoDictionary
    INPUT: locale, tenant.id (from src/config module-level), Supabase settings
    OUTPUT: SeoDictionary typed object
    BOUNDARY: server-only, React cache + unstable_cache, tenant-keyed

src/config/seo/seo.{locale}.json
    OWNS: canonical full key structure = SeoDictionary type source
    BOUNDARY: must always be the superset of all tenant seo JSON keys

src/config/tenants/{id}/seo.{locale}.json
    OWNS: per-tenant SEO text overrides
    BOUNDARY: subset of base key structure only; no new keys not in base

src/app/sitemap.ts
    OWNS: per-tenant XML sitemap, hreflang alternates, URL list
    BOUNDARY: calls getStoreConfig() only — no direct tenant file imports

src/app/robots.ts
    OWNS: per-tenant crawl rules + sitemap pointer
    BOUNDARY: calls getStoreConfig() only

src/app/llms.txt/route.ts
    OWNS: AI-crawler plain-text manifest
    BOUNDARY: calls getStoreConfig() only; all prose from site.* fields

src/components/JsonLd.tsx
    OWNS: serialization only — receives plain objects, emits <script>
    BOUNDARY: zero business logic, zero config reads
```

---

## Build Order Implications

The milestone adds net-new page types (comparison, cost/pricing, knowledge hub) and
deepens per-tenant content. The correct implementation sequence respects the data → schema → page
dependency chain:

**Phase 1 — Data completeness (unblocks everything else)**
Complete `site.ts`, `location.ts`, `services.ts` for all secondary tenants.
Add `llmsDescription` field to each `site.ts`.
Fill NAP/hours/pricing gaps. Without this, all downstream schema and answer content is wrong.

**Phase 2 — SEO JSON depth**
Add net-new key groups to base `seo.{locale}.json` (comparison.*, pricing.*, faq.extended.*).
Fill per-tenant `seo.{locale}.json` for all tenants simultaneously.
Run `seo-parity.test.ts` to confirm FR/EN parity.

**Phase 3 — Schema builders**
Add `comparisonPageGraph()`, `pricingPageGraph()` to `src/lib/seo.ts`.
Add tests to `src/lib/seo.test.ts`. Schema builders are pure functions — test-first is cheap.

**Phase 4 — Net-new pages**
Build comparison and cost/pricing routes under `src/app/[lang]/`. Each page calls
the appropriate schema builder + `pageMetadata()`. Add to `site.routes` + sitemap.

**Phase 5 — llms.txt + AI measurement**
Update `llms.txt/route.ts` to use `site.llmsDescription` and `site.routes`.
Add AI-referrer GA4 event client component. Wire per-tenant GA4 measurement ID.

**Phase 6 — Audit and parity check**
Run schema validation (Google Rich Results Test equivalent) per tenant.
Verify sitemap and robots serve correct domain per tenant in staging.
Confirm no cross-tenant cache entries via cache tag inspection.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase | `readStoreSettings()` → deepMerge over static | Cached 60s, tag `store-seo:{id}`. Falls back to static on error |
| Google Search Console | `GSC_VERIFICATION` env var → `verification.google` in layout metadata | Per-tenant: set per container deployment |
| Bing Webmaster | `BING_VERIFICATION` env var → `other["msvalidate.01"]` | Same pattern as GSC |
| GA4 | `site.ga4MeasurementId` → CustomCodeHost snippet | Per-tenant property ID; AI referrer events attach here |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `seo-content.ts` → `seo.ts` | `seo-content.ts` fetches text; `seo.ts` builders receive injected SeoConfig | Never import seo-content.ts from seo.ts (direction matters for server-only) |
| `sitemap.ts` → `getStoreConfig()` | Direct async call at request time | No React cache here — sitemap.ts is a route handler, not a React tree |
| Schema builders → `<JsonLd>` | Pass plain object, never import builder inside JsonLd | JsonLd is pure serializer |
| Tenant configs → crawl-layer routes | Via `getStoreConfig()` only — never direct import in route handlers | Prevents build-time baking |

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 2-5 tenants (current) | Current model: one Docker image, runtime TENANT, 60s cache — sufficient |
| 10-20 tenants | Add automated seo-parity CI check across all tenants; llms.txt per-tenant test |
| 20+ tenants | Consider moving SEO JSON content to Supabase CMS rows instead of committed JSON files; keep static config as fallback |

The schema builder layer (pure functions in `src/lib/seo.ts`) does not need to change
at any tenant scale — it is stateless and accepts injected config.

---

## Sources

- Direct inspection of `src/lib/seo.ts`, `src/app/sitemap.ts`, `src/app/robots.ts`,
  `src/app/llms.txt/route.ts`, `src/app/[lang]/seo-content.ts`, `src/app/[lang]/layout.tsx`
- `src/lib/seo-dictionary.ts` — type derivation pattern
- `src/config/seo/seo.fr.json` — canonical key structure inspection
- `.planning/codebase/ARCHITECTURE.md` — force-dynamic constraint, cache model
- `.planning/codebase/STRUCTURE.md` — file locations, tenant directory layout
- `.planning/PROJECT.md` — milestone scope and validated requirements

---
*Architecture research for: multi-tenant Next.js App Router SEO/GEO layer*
*Researched: 2026-06-17*
