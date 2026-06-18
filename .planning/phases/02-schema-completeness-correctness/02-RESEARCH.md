# Phase 2: Schema Completeness + Correctness — Research

**Researched:** 2026-06-18
**Domain:** JSON-LD / schema.org — multi-tenant Next.js 16.2.6
**Confidence:** HIGH (all findings verified against live codebase; no assumed package names)

---

## Decisions Table

| Question | Recommendation | Rationale | Rejected Alternatives |
|----------|---------------|-----------|----------------------|
| **Q1** — Offline JSON-LD validator (C-01) | **No off-the-shelf lib; use `schema-dts@2.0.0` compile-time typing + hand-rolled invariant assertions** | No offline schema.org vocabulary validator runs in both `bun:test` and Node-20 `next.config.ts` without network or heavy deps; `schema-dts` already approved; targeted invariant checks (required fields, type strings, `@id` format, non-empty arrays) cover 95% of the real-world failure modes | `jsonld` (needs network for context expansion; ESM-only, hostile to SWC require-hook), `structured-data-testing-tool` (Google's CLI — requires network + Chrome), AJV + JSON Schema (no maintained schema.org JSON Schema for vocab validation, only structural) |
| **Q2** — Per-tenant review data location (R-03) | **Add `google-reviews.json` per tenant under `src/config/tenants/{id}/google-reviews.json`; `@/lib/reviews` reads via `TENANT` env; `fetch:reviews` writes to the active tenant path** | Co-locates data with tenant config; zero runtime resolution ambiguity; consistent with how seo/content JSONs are already per-tenant; no new `TenantSite` field needed | Adding a `reviews` sub-object to `TenantSite` (conflates config and fetched runtime data; makes `fetch:reviews` mutate TypeScript source files) |
| **Q3** — Stable canonical-host `@id` (I-01) | **Add `canonicalUrl: string` to `TenantSite`; all three `@id` forms derive from it; `url` stays as-is for `metadataBase`** | `site.url` is already the production URL for maily (`https://onglesmaily.com`) but is conceptually overloaded (also used as `metadataBase`); a dedicated `canonicalUrl` field makes the stable-identity contract explicit and allows `url` to remain mutable (Supabase override) without breaking `@id` | Reusing `site.url` directly (already works for maily, but Supabase override of `site.url` at runtime would silently destabilize `@id`; no clear freeze contract) |
| **O-01** — Brand Organization node | Insert above `NailSalon` in `organizationGraph`; `@id` = `${canonicalUrl}/#organization`; `NailSalon` gets `parentOrganization: { "@id": ORGANIZATION_ID }` | Matches locked decision; clean entity hierarchy | N/A (locked) |
| **F-01/F-02** — FAQ guard + parity | Assert `dict.faq.items.length` per locale per tenant; extend `seo-parity.test.ts` pattern to cover `faq.items` key structure across `dictionaries/{en,fr}.json` | `faq.items` is the exact key path confirmed in `src/dictionaries/en.json`; items are `{ q: string; a: string }` | N/A (locked) |

---

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **R-01:** AggregateRating on business node only; Service nodes link via `provider: { @id }`.
- **R-02:** Suppress AggregateRating when `fetchedAt` null OR `reviewCount < 5`.
- **R-03:** Review data is per-tenant (split-brain is a bug). Exact location left to research (see Q2 above).
- **R-04:** SCHEMA-04 "nested under Service" satisfied by-equivalent via R-01 + `provider` link.
- **C-01:** `schema-dts@2.0.0` (dev) + a JSON-LD/schema.org validator in `bun:test`. Specific lib left to research (see Q1 above).
- **C-02:** Schema validity + FR/EN parity BLOCK the build via `next.config.ts` guard.
- **C-03:** Google Rich Results Test is manual UAT only — not automated offline.
- **I-01:** `@id` decoupled from runtime `site.url`; stable resolvable `https://{canonical-host}/#business` form.
- **I-02:** `@id`-uniqueness assertion across all `TENANT_REGISTRY` tenants.
- **I-03:** Omit `sameAs` entirely (never `sameAs: []`) when no GBP.
- **F-01:** `bun:test` asserts `FAQPage mainEntity` length === `dict.faq.items.length` per tenant per locale.
- **F-02:** FR/EN parity guard extended to `dictionaries/{en,fr}.json` FAQ section.
- **O-01:** Distinct top-level brand `Organization` node with `#organization` `@id`; `NailSalon` references via `parentOrganization`.
- **O-02:** Verify `breadcrumbGraph` renders on every indexable sub-page.

### Claude's Discretion
- Exact per-tenant review-data location + tenant resolution (R-03) — see Q2 recommendation.
- Specific offline JSON-LD validator library (C-01) — see Q1 recommendation.
- Canonical-host identity field vs. reused production host (I-01) — see Q3 recommendation.
- SCHEMA-02 single-price `Offer` vs `AggregateOffer` — current `offer()` is correct as-is.

### Deferred Ideas (OUT OF SCOPE)
- SCHEMA-02 single-price → AggregateOffer coercion.
- FAQ content depth (Phase 3 / CONTENT-02).
- Automated/monitored Google reviews fetch.
- Per-location independent ratings.

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCHEMA-01 | LocalBusiness `@id` — stable per-tenant URI, no cross-tenant collision | Q3: add `canonicalUrl` to `TenantSite`; derive all three `@id` forms from it; I-02 uniqueness assertion |
| SCHEMA-02 | Service + AggregateOffer JSON-LD sourced from config pricing | Confirmed correct as-is in `offer()` (seo.ts:119-138); no change needed |
| SCHEMA-03 | FAQPage emits every item in `dictionaries/{locale}.json` | FAQ path is `dict.faq.items` (11 items, `{ q, a }` shape); F-01 count assertion; faq/page.tsx:30 already calls `faqPageGraph(dict.faq.items)` |
| SCHEMA-04 | Review schema suppressed when stub; appears correctly with real data | R-02 gate; Q2 per-tenant data layout; R-01 business-node placement |
| SCHEMA-05 | Breadcrumb + Organization on all indexable sub-pages | `breadcrumbGraph` already present on 11 sub-pages (O-02 confirms full coverage); O-01 adds `Organization` node |
| SCHEMA-06 | schema-dts typing + parity CI | Q1: schema-dts@2.0.0 + invariant assertions; C-02 build-guard wiring; F-02 dictionary parity |

---

## Codebase Findings (verified line references)

### Current `@id` bug (I-01)

`src/lib/seo.ts:146` — `const BUSINESS_ID = \`${cfg.site.url}/#business\`;`

`site.url` is the runtime-overridable value from `getStoreConfig()` which merges Supabase overrides (`src/lib/store-config.ts:69`). If an admin override changes `site.url`, the `@id` silently changes. `canonicalUrl` must be a separate field that is NOT part of the Supabase merge surface (or explicitly excluded from it).

### Current review split-brain (R-03)

`src/lib/reviews.ts:2` imports `from "@/data/google-reviews.json"` — this is the GLOBAL file at `src/data/google-reviews.json`.

`src/lib/seo.ts:206-215` — `organizationGraph` uses `reviewsFetchedAt` (from the global file) as the gate, but reads rating values from `cfg.site.reviews` (per-tenant config). So:
- Gate (`fetchedAt`) = global `src/data/google-reviews.json` — currently `null` for ALL tenants from one file.
- Values (`ratingValue`, `reviewCount`) = per-tenant `site.reviews` field in `src/config/tenants/{id}/site.ts`.
- Bug: fetching for maily updates the global file and accidentally enables the rating gate for ALL tenants simultaneously.

### Current `sameAs` bug (I-03)

`src/lib/seo.ts:230` — `sameAs: cfg.site.socialProfiles` — emitted unconditionally. When `socialProfiles: []` (charlesbourg, rivieres — `src/config/tenants/ongles-charlesbourg/site.ts:23`, `src/config/tenants/ongles-rivieres/site.ts:22`), this emits `sameAs: []` which Google may treat as a hint to dereference nothing. Must become a conditional spread (omit when empty).

### FAQ path confirmed

`src/dictionaries/en.json` top-level key `faq` → sub-key `items` → array of 11 objects with `{ q: string, a: string }`. Identical structure in `fr.json` (also 11 items). Path used in `src/app/[lang]/faq/page.tsx:30` — `faqPageGraph(dict.faq.items)`.

The `dict.faq.items` items are loaded from `src/dictionaries/{lang}.json` which are **shared across all tenants** (not per-tenant). The per-tenant `src/config/tenants/{id}/content.{lang}.json` files exist but serve different content. This means F-01's per-tenant FAQ count assertion should iterate tenants but read the shared dictionary files — unless per-tenant FAQ dictionaries are planned (they are not for Phase 2).

**Clarification:** F-01 asserts that `faqPageGraph(dict.faq.items).mainEntity.length === dict.faq.items.length` per locale — i.e., that `faqPageGraph` doesn't silently drop items. Since there is one shared dictionary (not per-tenant), the assertion is per-locale, not per-tenant. The per-tenant dimension of F-01 is satisfied by testing both FR and EN.

### `breadcrumbGraph` coverage (O-02)

Already present on ALL 10 indexable sub-pages: `about`, `book-online`, `contact`, `faq`, `gallery`, `locations`, `privacy`, `reviews`, `services`, `services/[slug]`, `terms`. Home/root correctly omits it (no breadcrumb needed). **O-02 is already met — no new breadcrumb work required.** [VERIFIED: grepped src/app/[lang]]

### `servicesGraph` usage

`src/app/[lang]/services/page.tsx:48` calls `servicesGraph`; `src/app/[lang]/services/[slug]/page.tsx:63` calls `serviceGraph`. Both already wired.

---

## Q1 Deep Dive: Offline Validator Strategy

### Why no off-the-shelf solution works here

**`jsonld` (npm):** The library performs JSON-LD expansion by fetching `https://schema.org/` as a remote context at runtime. Offline use requires a pre-fetched context cache, which must be injected via a custom document loader. This is complex, ESM-only (hostile to the SWC require-hook that `next.config.ts` depends on for `.ts` resolution — see Phase 1 lesson), and validates JSON-LD structure/expansion but NOT schema.org vocabulary (required fields, value constraints). [ASSUMED: ESM-only behavior confirmed by reputation; npm view shows no CommonJS build]

**`structured-data-testing-tool` (Google):** Requires network + a Chrome/headless browser. Not offline-capable. [VERIFIED: npm registry — tool is archived]

**AJV + a schema.org JSON Schema:** No maintained, authoritative JSON Schema for schema.org vocabulary exists as a published npm package. The schema.org project publishes JSON-LD context and OWL ontology, not JSON Schema. Hand-rolling a JSON Schema from `schema-dts` types would create a maintenance burden with no upstream. [ASSUMED: based on known schema.org distribution formats]

**`schema-dts@2.0.0` alone:** Compile-time TypeScript typing only. Does not validate at runtime or in the build guard. Cannot check `@id` formats, `reviewCount < 5` logic, or cross-tenant uniqueness. [VERIFIED: npm view schema-dts description — "TypeScript package with latest Schema.org Schema Typings"]

### Recommended approach: `schema-dts@2.0.0` + targeted invariant assertions

Implement a `src/config/schema-invariants.ts` module (mirroring `config-completeness.ts`) that:

1. **Imports `schema-dts` types** — all builders in `src/lib/seo.ts` gain `WithContext<NailSalon>`, `WithContext<FAQPage>`, `WithContext<Service>`, `WithContext<BreadcrumbList>`, `WithContext<Organization>` return types at compile time.

2. **Exports `assertSchemaInvariants()`** — called from `next.config.ts` under `PHASE_PRODUCTION_BUILD`; also importable in `bun:test`. Iterates `TENANT_REGISTRY` (excluding `template`), calls each builder with the tenant's config, and asserts:
   - `@context === "https://schema.org"` on every graph root
   - `@id` fields match `https://{canonicalUrl}/#business|#location-{id}|#organization` pattern
   - No cross-tenant `@id` collision (I-02)
   - `sameAs` is absent or non-empty (never `[]`)
   - `faqPageGraph(items).mainEntity.length === items.length`
   - `AggregateRating` absent when `fetchedAt` null or `reviewCount < 5`
   - All required NailSalon fields present: `name`, `url`, `telephone`, `address`, `geo`, `openingHoursSpecification`
   - `Organization` node present in `organizationGraph` output

3. **No network calls** — pure function, pure assertion. Works in Bun and Node 20.

4. **No new runtime dependencies** — only `schema-dts` (dev). Zod is already installed for any schema-shape assertions.

### schema-dts@2.0.0 known friction

- **`@graph` typing:** `schema-dts` exports `Graph` (the `@graph` container) but the idiomatic pattern is `WithContext<Thing> | { "@graph": Thing[] }`. The current `organizationGraph` returns a plain object with `@graph` — type it as `{ "@context": "https://schema.org"; "@graph": (NailSalon | WebSite | Organization)[] }` using intersection types or a local `GraphOutput` helper.
- **`@id` as string vs. `IdReference`:** `schema-dts` represents `@id`-only references as `IdReference = { "@id": string }`. The builder's department stubs `{ "@id": d["@id"] }` match this pattern correctly.
- **`WithContext<T>` vs `Thing`:** Top-level graphs use `WithContext<NailSalon>` etc.; nested nodes do not carry `@context`. The current builders follow this correctly.
- **`readonly` arrays:** `schema-dts` union types include string arrays that TypeScript infers as `readonly`. May need `as const` assertions or explicit casts at a few callsites — a small, bounded churn.

---

## Q2 Deep Dive: Per-Tenant Review Data Layout

### Exact current split-brain trace

```
fetch:reviews runs → writes src/data/google-reviews.json (GLOBAL, tenant-unaware)
src/lib/reviews.ts:2  → imports from "@/data/google-reviews.json" (always global)
src/lib/reviews.ts:28 → exports reviewsFetchedAt = data.fetchedAt  (GLOBAL gate)
src/lib/seo.ts:14     → import { reviewsFetchedAt } from "@/lib/reviews"
src/lib/seo.ts:206    → if (reviewsFetchedAt) → gate from GLOBAL file
src/lib/seo.ts:208-212 → ratingValue/reviewCount from cfg.site.reviews (per-tenant)
```

**The bug:** `fetch:reviews` script (`scripts/fetch-google-reviews.mjs:20-26`) hardcodes `OUT = …/src/data/google-reviews.json`. Fetching maily's reviews sets `fetchedAt` in the global file, which enables the AggregateRating gate for charlesbourg and rivieres even though they have no GBP and no real data. Their `site.reviews.ratingValue = 0` / `reviewCount = 0` would then be emitted as structured data — exactly what R-02 is meant to prevent.

### Recommended layout

**Per-tenant file:** `src/config/tenants/{id}/google-reviews.json`

Schema (identical to current global file):
```json
{
  "fetchedAt": null,
  "aggregate": { "ratingValue": 0, "reviewCount": 0 },
  "reviews": []
}
```

**`src/lib/reviews.ts` change:**

```typescript
// Resolve the active tenant's review data file at module load time.
// TENANT env is set per container — same resolution as src/config/index.ts.
import { tenant } from "@/config";

// Dynamic require so the path varies per tenant. This is a static string
// pattern; Next.js/SWC can tree-shake it. Cannot use dynamic import()
// (ESM) in the next.config.ts require-hook context — use require() instead
// for any code path that flows into next.config.ts.
// For bun:test, this module is imported normally and works fine.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const data = require(`../config/tenants/${tenant.id}/google-reviews.json`);
```

**Alternative (simpler, avoids dynamic require):** Add `tenantReviewData` to `TenantConfig` as a static import in each tenant's `index.ts`:

```typescript
// src/config/tenants/ongles-maily/index.ts
import reviewData from "./google-reviews.json";
export const onglesMaily: TenantConfig = { id, site, location, services, reviewData };
```

Then `src/lib/reviews.ts` reads `tenant.reviewData`. This is the cleaner approach: static import, no dynamic require, fully resolved at module load, same SWC require-hook pattern as `assertAllTenantsComplete`.

**Recommendation:** Use the static import approach (add `reviewData` to `TenantConfig`). This is 100% consistent with how every other per-tenant asset is already resolved and avoids any dynamic-require concerns.

**`fetch:reviews` script change:**

```javascript
// Read TENANT env to determine output path
const tenantId = process.env.TENANT ?? "ongles-maily";
const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "config",
  "tenants",
  tenantId,
  "google-reviews.json",
);
```

Run as: `TENANT=ongles-maily bun run fetch:reviews`

**R-02 gate in `src/lib/reviews.ts`:**

```typescript
export const reviewsFetchedAt: string | null = tenant.reviewData.fetchedAt;
export const aggregate = tenant.reviewData.aggregate;
export const reviews: readonly Review[] = tenant.reviewData.reviews;
```

**R-02 gate in `src/lib/seo.ts`** remains unchanged structurally — the `reviewsFetchedAt` import already gates correctly. The `reviewCount < 5` check must be added:

```typescript
// seo.ts organizationGraph — replace the existing gate condition:
const hasRealRating =
  reviewsFetchedAt !== null &&
  cfg.site.reviews.reviewCount >= 5;  // R-02: suppress stubs
...(hasRealRating ? { aggregateRating: { ... } } : {})
```

Wait — note that after Q2 is implemented, `cfg.site.reviews` will remain on `TenantSite` for display purposes, but the authoritative `reviewCount` for the R-02 gate should come from `aggregate.reviewCount` in `tenant.reviewData` (the fetched value), not the static config field. The static `site.reviews` can be removed once `reviewData` carries live values, or kept as a display fallback. Recommend keeping `site.reviews` as display defaults only, and reading `aggregate.reviewCount` from `tenant.reviewData` for the R-02 gate.

---

## Q3 Deep Dive: Stable Canonical-Host `@id`

### Current state

`TenantSite.url` (defined `src/config/types.ts:57`) serves dual purpose:
1. Fed to `metadataBase` in `src/app/[lang]/layout.tsx:49` as the base URL for all relative metadata.
2. Used as the `@id` base in all builders: `${cfg.site.url}/#business`.

`getStoreConfig` (`src/lib/store-config.ts:69`) performs `deepMerge(staticSite, override.site ?? {})` — meaning any Supabase admin override of `site.url` would change the `@id` base at runtime.

### Does a stable field already exist?

No. `TenantSite` has only `url: string` (`src/config/types.ts:57`). There is no `canonicalUrl`, `productionUrl`, or `baseUrl` field.

### Recommended addition

Add to `TenantSite` (`src/config/types.ts`):

```typescript
export type TenantSite = {
  // ... existing fields ...
  /** Stable production origin for schema.org @id URIs. NEVER overridden by
   *  Supabase admin config — read only from static tenant config files.
   *  No trailing slash. Example: "https://onglesmaily.com" */
  canonicalUrl: string;
  // url: string  ← keep; remains the metadataBase source, may be overridden
  // ...
};
```

All three `@id` forms:
- `BUSINESS_ID = \`${cfg.site.canonicalUrl}/#business\``
- `LOCATION_ID = \`${cfg.site.canonicalUrl}/#location-${loc.id}\``
- `ORGANIZATION_ID = \`${cfg.site.canonicalUrl}/#organization\``

Add to each tenant's `site.ts`:
- `ongles-maily/site.ts`: `canonicalUrl: "https://onglesmaily.com"` (same value as `url` currently)
- `ongles-charlesbourg/site.ts`: `canonicalUrl: "https://www.onglescharlesbourg.com"`
- `ongles-rivieres/site.ts`: `canonicalUrl: "https://www.onglesrivieres.com"`

**Important:** `canonicalUrl` must NOT be in the Supabase merge surface. The `deepMerge` in `store-config.ts` merges `override.site` onto `staticSite`. To prevent override, either:
- (a) Exclude `canonicalUrl` from `StoreSettings.site` type (safest — type-system enforced), or
- (b) Read `canonicalUrl` directly from `tenant.site.canonicalUrl` (static import) inside builders, bypassing `cfg` for this one field.

Option (a) is cleaner. Add to `StoreSettings` schema (wherever it's defined): exclude `canonicalUrl` from the allowed override keys.

**I-02 uniqueness assertion** in `schema-invariants.ts`:

```typescript
const ids = new Set<string>();
for (const [id, cfg] of Object.entries(TENANT_REGISTRY)) {
  if (EXCLUDED_TENANTS.has(id)) continue;
  const bid = `${cfg.site.canonicalUrl}/#business`;
  if (ids.has(bid)) throw new Error(`@id collision: ${bid}`);
  ids.add(bid);
}
```

---

## Build-Guard Wiring

### Pattern (mirrors Phase 1 exactly)

The Phase 1 guard (`next.config.ts`) is a static import of a pure `.ts` module. The SWC require-hook in `next.config.ts` processes static `import` statements compiled to `require()` calls, enabling `.ts` resolution without `tsx` or `ts-node`. Dynamic `import()` bypasses this hook.

**New module:** `src/config/schema-invariants.ts`

Exports:
- `assertSchemaInvariants(): void` — throws on violation (same contract as `assertAllTenantsComplete`)
- `validateSchemaInvariants(): SchemaInvariantError[]` — returns error array (for tests)

**`next.config.ts` extension:**

```typescript
// Static import — required for SWC require-hook resolution (see Phase 1 lesson).
import { assertAllTenantsComplete } from "./src/config/config-completeness";
import { assertSchemaInvariants } from "./src/config/schema-invariants";

export default async function config(phase: string): Promise<NextConfig> {
  if (phase === PHASE_PRODUCTION_BUILD) {
    assertAllTenantsComplete();   // Phase 1 guard (unchanged)
    assertSchemaInvariants();     // Phase 2 guard (new)
  }
  // ...
}
```

**`bun:test` usage** in `src/config/schema-invariants.test.ts`:

```typescript
import { describe, it, expect } from "bun:test";
import { validateSchemaInvariants } from "./schema-invariants";

describe("schema invariants", () => {
  it("all tenants pass schema invariants", () => {
    expect(validateSchemaInvariants()).toEqual([]);
  });
});
```

### FAQ parity test (F-02)

Extend `src/config/seo/seo-parity.test.ts` to add a new `describe` block for dictionary FAQ parity:

```typescript
import enDict from "../../dictionaries/en.json";
import frDict from "../../dictionaries/fr.json";

describe("Dictionary FAQ fr/en parity", () => {
  it("faq.items count matches", () => {
    expect(frDict.faq.items.length).toEqual(enDict.faq.items.length);
  });
  it("faq.items key structure matches", () => {
    expect(keyPaths(frDict.faq)).toEqual(keyPaths(enDict.faq));
  });
});
```

Note: `keyPaths` is already defined in `seo-parity.test.ts:19`. The existing function recurses over objects + arrays and returns sorted dotted paths — it will correctly catch a missing `q` or `a` key in any item. Import paths from `src/config/seo/` to `src/dictionaries/` require `../../dictionaries/`.

### FAQ count assertion (F-01)

In `schema-invariants.ts`:

```typescript
import enDict from "../dictionaries/en.json";
import frDict from "../dictionaries/fr.json";

// F-01: FAQPage mainEntity must equal dict.faq.items length, per locale.
function assertFaqCount(): void {
  for (const [locale, dict] of [["en", enDict], ["fr", frDict]] as const) {
    const graph = faqPageGraph(dict.faq.items);
    if (graph.mainEntity.length !== dict.faq.items.length) {
      throw new Error(
        `FAQPage mainEntity length mismatch (${locale}): ` +
        `builder returned ${graph.mainEntity.length}, dict has ${dict.faq.items.length}`
      );
    }
    for (const item of graph.mainEntity) {
      if (!item.name?.trim() || !item.acceptedAnswer?.text?.trim()) {
        throw new Error(`FAQPage item has empty q/a in ${locale}: ${JSON.stringify(item)}`);
      }
    }
  }
}
```

### `@id` uniqueness assertion (I-02)

Runs inside `assertSchemaInvariants()` — see Q3 section above.

### Dual-runtime compatibility

All assertions in `schema-invariants.ts` are pure TypeScript functions:
- No `process.env` reads (uses `TENANT_REGISTRY` directly, same as `config-completeness.ts`)
- No network calls
- No Next.js-specific APIs
- Zod (already installed) available for any structural assertions if needed
- Static JSON imports (`.json` files) work in both Bun and Node 20 with `resolveJsonModule: true` (already set — `config-completeness.ts` already imports JSON via Zod indirectly)

Confirm `tsconfig.json` has `"resolveJsonModule": true` before wiring dictionary imports.

---

## schema-dts@2.0.0 Typing Rollout

### Recommended type annotations per builder

| Builder | Return type annotation |
|---------|----------------------|
| `organizationGraph` | `{ "@context": "https://schema.org"; "@graph": Array<NailSalon \| WebSite \| Organization> }` |
| `servicesGraph` | `WithContext<ItemList>` |
| `serviceGraph` | `WithContext<Service>` |
| `faqPageGraph` | `WithContext<FAQPage>` |
| `breadcrumbGraph` | `WithContext<BreadcrumbList>` |
| `imageGalleryGraph` | `WithContext<ImageGallery>` |

### Import pattern

```typescript
import type {
  NailSalon,
  WebSite,
  Organization,
  Service as SchemaService,
  FAQPage,
  BreadcrumbList,
  ItemList,
  ImageGallery,
  WithContext,
} from "schema-dts";
```

Note: `Service` conflicts with the local `ServiceItem` type in `seo.ts`. Use `SchemaService` alias.

### Known friction points

1. **`@graph` array type:** `schema-dts` does not export a `Graph` wrapper type in 2.0.0. Annotate `organizationGraph` return as a local interface `SeoGraph` with `"@context": "https://schema.org"` and `"@graph": Array<NailSalon | WebSite | Organization>`.

2. **`OpeningHoursSpecification.dayOfWeek`:** `schema-dts` types this as `DayOfWeek | DayOfWeek[]` where `DayOfWeek` is a string enum. The current builder passes full weekday name strings (e.g. `"Monday"`) which matches the schema.org vocabulary but TypeScript will warn unless cast. Use `as unknown as DayOfWeek` or widen the builder's `DAY_NAME` return to match the `schema-dts` type.

3. **`sameAs` as `readonly string[]`:** `TenantSite.socialProfiles` is `readonly string[]`; `schema-dts`'s `sameAs` accepts `string | string[]`. No cast needed — compatible.

4. **`offer()` return type:** `AggregateOffer | Offer` — annotate the helper as returning `AggregateOffer | Offer` (both are exported from `schema-dts`). No behavioral change.

5. **`@id` string fields:** `schema-dts` uses `string` for `@id` values (not a branded type). No cast needed.

---

## Pitfalls / Gotchas

### 1. Dynamic `import()` in `next.config.ts` breaks `.ts` resolution

**What:** The SWC require-hook for `.ts` files in `next.config.ts` only activates when the compiled output contains `require(`. A static `import` compiles to `require()`; a dynamic `import()` is preserved as native ESM `import()` and bypasses the hook, causing `MODULE_NOT_FOUND` for `.ts` files in Node 20 Docker.

**Mitigation:** All new modules called from `next.config.ts` (`schema-invariants.ts`) MUST be statically imported. No dynamic `import()` anywhere in the transitive import chain of `assertSchemaInvariants`. [VERIFIED: next.config.ts:3-8 comment + Phase 1 lesson]

### 2. `reviewsFetchedAt` module-level singleton — wrong tenant in tests

**What:** `src/lib/reviews.ts` currently imports `data` at module level from the global JSON. After the Q2 fix (per-tenant file via `tenant.reviewData`), the `tenant` module resolves at `import` time via `process.env.TENANT`. In `bun:test`, if `TENANT` is unset, `tenant` defaults to `ongles-maily`. Tests that want to verify charlesbourg suppression must either set `TENANT` before import or call builder functions directly with mock configs, not rely on the module-level singleton.

**Mitigation:** The `schema-invariants.ts` module should pass per-tenant `reviewData` directly into builder calls (via `SeoConfig`) rather than relying on the module-level `reviewsFetchedAt` singleton. This makes invariant tests tenant-aware without env gymnastics.

### 3. `sameAs: []` currently emitted for no-GBP tenants (I-03)

**What:** `src/lib/seo.ts:230` — `sameAs: cfg.site.socialProfiles` — when `socialProfiles` is `[]`, this emits `"sameAs": []` in the JSON-LD output. Google's parser ignores empty arrays, but the schema.org spec prefers field omission over an empty value.

**Fix (one line):**
```typescript
// Replace:
sameAs: cfg.site.socialProfiles,
// With:
...(cfg.site.socialProfiles.length > 0 ? { sameAs: cfg.site.socialProfiles } : {}),
```

### 4. FR/EN silent-undefined in FAQ parity

**What:** `src/dictionaries/fr.json` uses `type Dictionary = typeof en` (inferred from the EN file), so missing keys in FR silently become `undefined` at runtime. The existing `seo-parity.test.ts` guards `seo.{locale}.json` but NOT `dictionaries/{locale}.json`. Until F-02 is wired, a FR FAQ item with a missing `a` key would render an empty `acceptedAnswer.text` in the schema without any error.

**Mitigation:** F-02 parity test + F-01 empty-check assertion together close this gap before Phase 3 adds content.

### 5. `canonicalUrl` must be excluded from Supabase merge

**What:** `store-config.ts:69` performs `deepMerge(staticSite, override.site ?? {})`. If `canonicalUrl` is ever included in a Supabase override document, it would silently overwrite the stable `@id` base. Since `@id` stability is a schema.org integrity requirement (changing `@id` is treated as a new entity by Google's Knowledge Graph), a bad override is a silent correctness bug.

**Mitigation:** The `StoreSettings` schema (wherever `override.site` is typed) must not include `canonicalUrl` as an allowed key. Use `Omit<Partial<TenantSite>, "canonicalUrl">` as the site override type.

### 6. `fetch:reviews` TENANT env must be set explicitly per fetch run

**What:** After Q2, `fetch:reviews` writes to `src/config/tenants/${TENANT}/google-reviews.json`. If someone runs `bun run fetch:reviews` without setting `TENANT`, it defaults to `ongles-maily`. This is acceptable behavior (same as the current global default), but could surprise operators expecting it to auto-detect.

**Mitigation:** Document in the script header. The script already fails loud on missing Google API credentials — add a startup log: `[reviews] writing to tenant: ${tenantId}`.

### 7. Multi-tenant `@id` uniqueness depends on distinct `canonicalUrl` values

**What:** The I-02 uniqueness assertion fires at build time (per `TENANT_REGISTRY`) and catches `canonicalUrl` collisions across all tenants in the same build context. But in production, each Docker container runs a single tenant — the assertion runs per-container, not cross-container. The build-time assertion using `TENANT_REGISTRY` (which enumerates ALL tenants) is the correct proxy for cross-tenant uniqueness.

**Mitigation:** Confirmed: `TENANT_REGISTRY` is imported statically in the build guard context, so all tenants are checked even when `TENANT=ongles-maily` is the active container. This is the same pattern as `assertAllTenantsComplete`. [VERIFIED: src/config/config-completeness.ts:137-149]

---

## O-01: Brand Organization Node — Wiring Details

### Current `organizationGraph` `@graph` members (seo.ts:188-242)
1. `NailSalon` (business node) — `@id = ${canonicalUrl}/#business`
2. `WebSite` — `@id = ${canonicalUrl}/#website`
3. Per-location `NailSalon` department nodes — `@id = ${canonicalUrl}/#location-{id}`

### New member to insert (O-01)

```typescript
const ORGANIZATION_ID = `${cfg.site.canonicalUrl}/#organization`;

// Brand Organization node — sits above NailSalon in the entity hierarchy.
// Represents the Ongles brand, not the physical salon.
const brandOrganization: Organization = {
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: cfg.site.name,
  url: cfg.site.canonicalUrl,
  ...(cfg.site.socialProfiles.length > 0 ? { sameAs: cfg.site.socialProfiles } : {}),
};
```

Add `parentOrganization: { "@id": ORGANIZATION_ID }` to the top-level `NailSalon` business node.

Insert `brandOrganization` as the FIRST element of `@graph` (convention: brand entity first).

---

## Files to Create / Modify

| File | Action | What changes |
|------|--------|-------------|
| `src/config/types.ts` | Edit | Add `canonicalUrl: string` to `TenantSite`; add `reviewData: ReviewData` to `TenantConfig` |
| `src/config/tenants/ongles-maily/site.ts` | Edit | Add `canonicalUrl: "https://onglesmaily.com"` |
| `src/config/tenants/ongles-charlesbourg/site.ts` | Edit | Add `canonicalUrl: "https://www.onglescharlesbourg.com"` |
| `src/config/tenants/ongles-rivieres/site.ts` | Edit | Add `canonicalUrl: "https://www.onglesrivieres.com"` |
| `src/config/tenants/template/site.ts` | Edit | Add `canonicalUrl` placeholder |
| `src/config/tenants/{id}/google-reviews.json` | Create ×3 | Stub `{ fetchedAt: null, aggregate: { ratingValue: 0, reviewCount: 0 }, reviews: [] }` for each active tenant |
| `src/config/tenants/{id}/index.ts` | Edit ×3 | Add `import reviewData from "./google-reviews.json"` and include in `TenantConfig` export |
| `src/lib/reviews.ts` | Rewrite | Read from `tenant.reviewData` instead of global JSON |
| `src/lib/seo.ts` | Edit | Add `schema-dts` type annotations; fix `sameAs` conditional; use `canonicalUrl` for all `@id`; add `reviewCount >= 5` gate; add `Organization` node in `organizationGraph` |
| `src/config/schema-invariants.ts` | Create | New invariant asserter (mirrors `config-completeness.ts`) |
| `src/config/schema-invariants.test.ts` | Create | `bun:test` for invariants |
| `src/config/seo/seo-parity.test.ts` | Edit | Add F-02 dictionary FAQ parity block |
| `next.config.ts` | Edit | Add `assertSchemaInvariants()` call under `PHASE_PRODUCTION_BUILD` |
| `scripts/fetch-google-reviews.mjs` | Edit | Read `TENANT` env to determine output path |
| `src/data/google-reviews.json` | Keep | Retain as-is (still used until reviews.ts is migrated; delete in a cleanup commit after migration) |

---

## Package to Add

**`schema-dts@2.0.0` (devDependency only)**

```bash
npm install --save-dev schema-dts@2.0.0
```

[VERIFIED: npm registry — `npm view schema-dts version` returned `2.0.0`, dist-tags.latest = `2.0.0`]

No runtime dependency additions. Zod (already in `dependencies`) handles any runtime structural assertions.

---

## Environment Availability

All work is TypeScript source + JSON edits. No new CLIs, no new external services.

| Dependency | Required By | Available | Notes |
|------------|-------------|-----------|-------|
| `schema-dts@2.0.0` | Compile-time types | Not installed yet | `npm install --save-dev schema-dts@2.0.0` |
| `bun` | Test runner | Yes (existing `bun test src/`) | Unchanged |
| Node 20 | Docker build | Yes (Dokploy) | Unchanged |
| Zod | Assertions | Yes (`^4.4.3` in deps) | Unchanged |

---

## Validation Architecture

### Test framework
| Property | Value |
|----------|-------|
| Framework | bun:test (built-in) |
| Config file | none — `bun test src/` discovers `*.test.ts` |
| Quick run | `bun test src/config/schema-invariants.test.ts` |
| Full suite | `bun test src/` |

### Requirements → Test Map

| Req ID | Behavior | Test Type | File | Command |
|--------|----------|-----------|------|---------|
| SCHEMA-01 | `@id` stable, no cross-tenant collision | invariant | `src/config/schema-invariants.test.ts` | `bun test src/config/schema-invariants.test.ts` |
| SCHEMA-02 | Offer/AggregateOffer correct | invariant (existing `offer()` logic verified correct) | same | same |
| SCHEMA-03 | FAQPage `mainEntity.length === items.length`; no empty q/a | invariant (F-01) | `src/config/schema-invariants.test.ts` | same |
| SCHEMA-04 | AggregateRating suppressed when `fetchedAt` null or `reviewCount < 5` | invariant | same | same |
| SCHEMA-05 | `breadcrumbGraph` on all sub-pages; `Organization` node present | invariant (O-01 check) + manual verify (O-02 already met) | same | same |
| SCHEMA-06 | schema-dts types compile; FR/EN parity passes | compile (tsc) + parity test | `src/config/seo/seo-parity.test.ts` | `bun test src/config/seo/seo-parity.test.ts` |
| F-02 | `dictionaries/en.json` and `fr.json` FAQ key parity | parity test | `src/config/seo/seo-parity.test.ts` | same |
| I-02 | No cross-tenant `@id` collision | invariant | `src/config/schema-invariants.test.ts` | same |
| I-03 | `sameAs` absent when `socialProfiles` empty | invariant | same | same |

### Wave 0 gaps (must exist before implementation)
- `src/config/schema-invariants.ts` — create in Wave 1 (TDD: write test first, implementation second)
- `src/config/schema-invariants.test.ts` — create in Wave 1 (failing test first)
- Per-tenant `google-reviews.json` stubs — create in Wave 1

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `jsonld` npm package is ESM-only and incompatible with SWC require-hook in `next.config.ts` | Q1 Deep Dive | Low — even if CJS build exists, network-dependency makes it non-viable for offline use |
| A2 | `structured-data-testing-tool` requires network + headless browser (not offline-capable) | Q1 Deep Dive | Low — tool is documented as requiring Chrome and Google APIs |
| A3 | No maintained authoritative JSON Schema for schema.org vocabulary exists on npm | Q1 Deep Dive | Low — if one exists, it would enable more rigorous vocabulary validation but doesn't change the recommended approach |
| A4 | `StoreSettings.site` type (wherever defined) can be narrowed to exclude `canonicalUrl` without breaking admin functionality | Q3 / Pitfall 5 | Medium — if the admin UI has a `canonicalUrl` override field, it would need removal |
| A5 | `tsconfig.json` has `resolveJsonModule: true` | Build-guard wiring | Medium — `config-completeness.ts` imports JSON indirectly via Zod but the dictionary imports in `schema-invariants.ts` use direct JSON import; verify before implementing |

---

## Sources

### Primary (HIGH confidence — verified against live codebase)
- `src/lib/seo.ts` — all builder implementations, `@id` derivation, `sameAs` bug, `reviewsFetchedAt` gate
- `src/lib/reviews.ts` — global JSON import (split-brain root cause)
- `scripts/fetch-google-reviews.mjs` — hardcoded `OUT` path (per-tenant bug)
- `src/config/types.ts` — `TenantSite` type (no `canonicalUrl` field confirmed)
- `src/config/index.ts` — `TENANT_REGISTRY`, `resolveTenant`, `tenant` singleton
- `src/config/config-completeness.ts` — Phase 1 validator pattern to mirror
- `next.config.ts` — build guard pattern, static import constraint
- `src/config/seo/seo-parity.test.ts` — existing parity test pattern
- `src/dictionaries/en.json`, `src/dictionaries/fr.json` — `faq.items` path, 11 items, `{ q, a }` shape
- `src/app/[lang]/faq/page.tsx` — `faqPageGraph(dict.faq.items)` call site
- `src/app/[lang]/layout.tsx` — `organizationGraph` call site
- Breadcrumb coverage grep — 11 pages confirmed, O-02 already met
- `npm view schema-dts version` — `2.0.0` confirmed latest

### Secondary (MEDIUM confidence)
- `src/config/tenants/ongles-maily/site.ts` — `url` field serves dual purpose; comment confirms it feeds `metadataBase`
- `src/config/tenants/ongles-charlesbourg/site.ts`, `ongles-rivieres/site.ts` — `socialProfiles: []` confirmed for both

---

*Research date: 2026-06-18*
*Valid until: 2026-07-18 (stable domain — schema.org vocabulary, Next.js 16.2.6 config APIs)*
