# Review Honesty Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the R-02 review-honesty decision (AggregateRating + Review-node gating) into one alias-free module so the builder, the build-time validator, and production all cross the same interface — killing the "tested path ≠ production path" fork.

**Architecture:** A pure, dependency-free core (`src/config/review-honesty.ts`) owns the two honesty predicates, the `5` threshold, and the single data accessor. `src/lib/seo.ts` gains a `reviewSchemaFragment` that wraps the predicates for JSON-LD emission and calls it from `organizationGraph` through a **required** `reviewData` (no `??` default → forgetting it is a compile error). `src/config/schema-invariants.ts` imports the same predicate instead of re-stating it. `src/lib/reviews.ts` shrinks to display-only.

**Tech Stack:** TypeScript, Next.js (App Router), `schema-dts`, `bun:test`. The validator is loaded by `next.config.ts` through an SWC require-hook that only resolves a `.ts` chain when every runtime import is **relative + alias-free** — the new core must obey this.

---

## Background — read before starting

Current fork (the bug this plan removes):

```ts
// src/lib/seo.ts:309 — the "??" is the fork.
const rd = cfg.reviewData ?? { fetchedAt: reviewsFetchedAt, aggregate };
const hasRealRating = rd.fetchedAt !== null && rd.aggregate.reviewCount >= 5;
```

Tests pass `cfg.reviewData`; the ONLY production caller (`src/app/[lang]/layout.tsx:98-101`) passes just `{ site, locations }`, so production falls through the `??` to the `src/lib/reviews.ts` module singletons. The two paths differ; the test cannot catch a production-wiring bug.

Existing types you MUST reuse (do NOT redefine them):

```ts
// src/config/types.ts:143 — alias-free, already exact.
export type ReviewData = {
  fetchedAt: string | null;
  aggregate: { ratingValue: number; reviewCount: number };
  reviews: readonly unknown[];
};
// src/config/types.ts:149
export type TenantConfig = { id: string; site: TenantSite; location: Location; services: readonly Service[]; reviewData: ReviewData; ... };
```

Constants already in `src/lib/seo.ts` that the fragment reuses:
- `MAX_REVIEW_NODES = 12` (`seo.ts:87`)
- `OG_LOCALE: Record<Locale, string>` (`seo.ts:60`)
- `type Review` imported from `@/lib/reviews` (`seo.ts:27`)

File responsibilities after this plan:

| File | Responsibility |
|------|----------------|
| `src/config/review-honesty.ts` (new) | The honesty decision: 2 predicates, the `5` threshold, `reviewDataFor(tenant)`. Alias-free. |
| `src/lib/seo.ts` | `reviewSchemaFragment` (JSON-LD wrapper) + `organizationGraph` using required `reviewData`. |
| `src/config/schema-invariants.ts` | `checkAggregateRating` asserts via the shared predicate. |
| `src/lib/reviews.ts` | Display-only: `Review` type + `reviews` list. |

---

## Task 1: Honesty core module

**Files:**
- Create: `src/config/review-honesty.ts`
- Test: `src/config/review-honesty.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/config/review-honesty.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import {
  RATING_MIN_REVIEWS,
  shouldPublishRating,
  shouldPublishReviewNodes,
  reviewDataFor,
} from "@/config/review-honesty";
import type { ReviewData, TenantConfig } from "@/config/types";

// Minimal ReviewData builder — only the gate-relevant fields matter here.
const rd = (o: {
  fetchedAt: string | null;
  aggregate?: { ratingValue: number; reviewCount: number };
  reviews?: readonly unknown[];
}): ReviewData => ({
  fetchedAt: o.fetchedAt,
  aggregate: o.aggregate ?? { ratingValue: 0, reviewCount: 0 },
  reviews: o.reviews ?? [],
});

describe("shouldPublishRating (R-02 rating gate)", () => {
  it("suppresses when fetchedAt is null, even with a high count", () => {
    expect(shouldPublishRating(rd({ fetchedAt: null, aggregate: { ratingValue: 4.9, reviewCount: 120 } }))).toBe(false);
  });
  it("suppresses at the boundary just below the minimum (count = 4)", () => {
    expect(shouldPublishRating(rd({ fetchedAt: "2026-01-01T00:00:00Z", aggregate: { ratingValue: 4.8, reviewCount: 4 } }))).toBe(false);
  });
  it("emits at exactly the minimum (count = 5)", () => {
    expect(shouldPublishRating(rd({ fetchedAt: "2026-01-01T00:00:00Z", aggregate: { ratingValue: 4.7, reviewCount: 5 } }))).toBe(true);
  });
  it("pins the threshold at 5", () => {
    expect(RATING_MIN_REVIEWS).toBe(5);
  });
});

describe("shouldPublishReviewNodes (review-body gate)", () => {
  it("suppresses when fetchedAt is null even if bodies are present", () => {
    expect(shouldPublishReviewNodes(rd({ fetchedAt: null, reviews: [{}] }))).toBe(false);
  });
  it("suppresses when no bodies exist", () => {
    expect(shouldPublishReviewNodes(rd({ fetchedAt: "2026-01-01T00:00:00Z", reviews: [] }))).toBe(false);
  });
  it("emits with at least one genuinely fetched body", () => {
    expect(shouldPublishReviewNodes(rd({ fetchedAt: "2026-01-01T00:00:00Z", reviews: [{}] }))).toBe(true);
  });
});

describe("reviewDataFor", () => {
  it("returns the tenant's reviewData record (the single gate source)", () => {
    const data = rd({ fetchedAt: "x", aggregate: { ratingValue: 4.5, reviewCount: 9 }, reviews: [{}] });
    const fakeTenant = { reviewData: data } as unknown as TenantConfig;
    expect(reviewDataFor(fakeTenant)).toBe(data);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/config/review-honesty.test.ts`
Expected: FAIL — `Cannot find module '@/config/review-honesty'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/config/review-honesty.ts`:

```ts
// Review honesty — the single owner of the R-02 gate decision.
//
// ALIAS-FREE + DEPENDENCY-FREE (relative + `import type` only): this module is
// imported by src/config/schema-invariants.ts, which next.config.ts loads via an
// SWC require-hook that only resolves a `.ts` chain when every RUNTIME import is
// relative and alias-free (no `@/`, no server-only, no runtime deps). `import
// type` is compile-time-erased and safe. Keep it this way — see the
// schema-invariants.ts header.
//
// Owns the rules that decide whether structured data may publish reviews:
//   - AggregateRating: only from a genuine fetch with a substantial total.
//   - Individual Review nodes: only when real fetched bodies exist.
// Publishing a fabricated / thin rating violates Google's review-snippet policy
// (integrity invariant T-02-01). The threshold lives here ONCE.

import type { ReviewData, TenantConfig } from "./types";

/** Minimum genuinely-fetched reviews before an AggregateRating may publish (R-02). */
export const RATING_MIN_REVIEWS = 5 as const;

/** R-02 rating gate: emit AggregateRating only from a real fetch with a substantial total. */
export function shouldPublishRating(rd: ReviewData): boolean {
  return rd.fetchedAt !== null && rd.aggregate.reviewCount >= RATING_MIN_REVIEWS;
}

/** Review-node gate: emit individual Review nodes only when real fetched bodies exist. */
export function shouldPublishReviewNodes(rd: ReviewData): boolean {
  return rd.fetchedAt !== null && rd.reviews.length > 0;
}

/** The single source of a tenant's gate data (replaces the reviews.ts singletons). */
export function reviewDataFor(tenant: TenantConfig): ReviewData {
  return tenant.reviewData;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/config/review-honesty.test.ts`
Expected: PASS — 10 tests pass.

- [ ] **Step 5: Verify the alias-free invariant holds**

Run: `grep -n 'from "@/' src/config/review-honesty.ts`
Expected: NO output (the implementation file has zero `@/` imports; only `./types`).

- [ ] **Step 6: Commit**

```bash
git add src/config/review-honesty.ts src/config/review-honesty.test.ts
git commit -m "feat(seo): add alias-free review-honesty core (R-02 predicates + threshold)"
```

---

## Task 2: `reviewSchemaFragment` in the SEO layer

**Files:**
- Modify: `src/lib/seo.ts` (add imports near line 27-29; add the function after `reviewNodes`, before `languageAlternates`)
- Test: `src/lib/review-schema-fragment.test.ts`

This wraps the pure predicates for JSON-LD emission. It does NOT yet touch `organizationGraph` (that is Task 3) — both `reviewNodes` and the new fragment coexist until Task 3 removes the old one.

- [ ] **Step 1: Write the failing test**

Create `src/lib/review-schema-fragment.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { reviewSchemaFragment } from "@/lib/seo";
import type { ReviewData } from "@/config/types";

const body = (i: number) => ({
  id: `r${i}`,
  author: `Author ${i}`,
  rating: 5,
  dateISO: "2025-11-03",
  lang: "fr",
  text: `Great service ${i}`,
});

const rd = (o: {
  fetchedAt: string | null;
  aggregate?: { ratingValue: number; reviewCount: number };
  reviews?: readonly unknown[];
}): ReviewData => ({
  fetchedAt: o.fetchedAt,
  aggregate: o.aggregate ?? { ratingValue: 0, reviewCount: 0 },
  reviews: o.reviews ?? [],
});

describe("reviewSchemaFragment", () => {
  it("omits aggregateRating when the rating gate suppresses (fetchedAt null)", () => {
    const out = reviewSchemaFragment({
      reviewData: rd({ fetchedAt: null, aggregate: { ratingValue: 4.9, reviewCount: 120 } }),
      bestRating: 5,
      lang: "fr",
    });
    expect("aggregateRating" in out).toBe(false);
  });

  it("emits aggregateRating from reviewData.aggregate with bestRating", () => {
    const out = reviewSchemaFragment({
      reviewData: rd({ fetchedAt: "2026-01-01T00:00:00Z", aggregate: { ratingValue: 4.7, reviewCount: 87 } }),
      bestRating: 5,
      lang: "fr",
    });
    expect(out.aggregateRating).toEqual({
      "@type": "AggregateRating",
      ratingValue: 4.7,
      reviewCount: 87,
      bestRating: 5,
    });
  });

  it("omits review nodes when no bodies exist", () => {
    const out = reviewSchemaFragment({
      reviewData: rd({ fetchedAt: "2026-01-01T00:00:00Z", aggregate: { ratingValue: 4.7, reviewCount: 87 }, reviews: [] }),
      bestRating: 5,
      lang: "fr",
    });
    expect("review" in out).toBe(false);
  });

  it("emits review nodes capped at MAX_REVIEW_NODES (12) with mapped shape", () => {
    const reviews = Array.from({ length: 15 }, (_, i) => body(i));
    const out = reviewSchemaFragment({
      reviewData: rd({ fetchedAt: "2026-01-01T00:00:00Z", aggregate: { ratingValue: 4.7, reviewCount: 87 }, reviews }),
      bestRating: 5,
      lang: "fr",
    });
    const nodes = out.review as Record<string, unknown>[];
    expect(nodes).toHaveLength(12);
    expect(nodes[0]).toEqual({
      "@type": "Review",
      author: { "@type": "Person", name: "Author 0" },
      datePublished: "2025-11-03",
      reviewBody: "Great service 0",
      inLanguage: "fr_CA",
      reviewRating: { "@type": "Rating", ratingValue: 5, bestRating: 5, worstRating: 1 },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/lib/review-schema-fragment.test.ts`
Expected: FAIL — `reviewSchemaFragment` is not exported from `@/lib/seo`.

- [ ] **Step 3: Add the imports**

In `src/lib/seo.ts`, find line 29:

```ts
import type { TenantSite, Location } from "@/config/types";
```

Replace it with:

```ts
import type { TenantSite, Location, ReviewData } from "@/config/types";
import { shouldPublishRating, shouldPublishReviewNodes } from "@/config/review-honesty";
```

- [ ] **Step 4: Add the fragment function**

In `src/lib/seo.ts`, immediately AFTER the `reviewNodes` function (it ends at line 116 with `}`) and BEFORE the `languageAlternates` comment (line 118), insert:

```ts
/**
 * The review JSON-LD fragment spread into the business node — the single place
 * that turns review honesty into schema. Both keys are gated by the shared
 * predicates in @/config/review-honesty, so the builder and the build-time
 * validator agree by construction. Emits nothing until a genuine fetch exists.
 */
export function reviewSchemaFragment({
  reviewData,
  bestRating,
}: {
  reviewData: ReviewData;
  bestRating: number;
}): { aggregateRating?: unknown; review?: unknown[] } {
  const out: { aggregateRating?: unknown; review?: unknown[] } = {};

  if (shouldPublishRating(reviewData)) {
    out.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: reviewData.aggregate.ratingValue,
      reviewCount: reviewData.aggregate.reviewCount,
      bestRating,
    };
  }

  if (shouldPublishReviewNodes(reviewData)) {
    out.review = (reviewData.reviews as readonly Review[])
      .slice(0, MAX_REVIEW_NODES)
      .map((r) => ({
        "@type": "Review",
        author: { "@type": "Person", name: r.author },
        datePublished: r.dateISO,
        reviewBody: r.text,
        inLanguage: OG_LOCALE[r.lang] ?? r.lang,
        reviewRating: {
          "@type": "Rating",
          ratingValue: r.rating,
          bestRating,
          worstRating: 1,
        },
      }));
  }

  return out;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test src/lib/review-schema-fragment.test.ts`
Expected: PASS — 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/seo.ts src/lib/review-schema-fragment.test.ts
git commit -m "feat(seo): add reviewSchemaFragment wrapping the shared R-02 predicates"
```

---

## Task 3: Rewire `organizationGraph` to the fragment; make `reviewData` required

**Files:**
- Modify: `src/lib/seo.ts` (`SeoConfig` type ~45-53; `organizationGraph` signature ~218-222; body ~302-325; delete `reviewNodes` ~97-116; imports ~27)
- Modify: `src/lib/reviews-r02-gate.test.ts` (thin to wiring cases)

This closes the fork: `organizationGraph`'s config becomes `OrgGraphConfig` with a **required** `reviewData`, so the compiler forces every caller to supply it and the `??` default disappears.

- [ ] **Step 1: Update the R-02 gate test to the new required-config seam (write the failing test first)**

Replace the ENTIRE contents of `src/lib/reviews-r02-gate.test.ts` with:

```ts
// R-02 gate WIRING test: proves reviewSchemaFragment is spread into the business
// node of organizationGraph. The full boundary matrix lives in
// src/config/review-honesty.test.ts and src/lib/review-schema-fragment.test.ts.
// This file only proves the wiring: emit when the gate passes, suppress when not.

import { describe, it, expect } from "bun:test";
import { organizationGraph, type OrgGraphConfig } from "@/lib/seo";
import { site as staticSite, locations as staticLocations } from "@/config";
import type { ReviewData } from "@/config/types";

function makeCfg(reviewData: ReviewData): OrgGraphConfig {
  return {
    site: {
      ...staticSite,
      // Distinct from reviewData so a regression that reads site.reviews is caught.
      reviews: { ratingValue: 4.9, reviewCount: 120, bestRating: 5, source: "google" },
    },
    locations: staticLocations,
    reviewData,
  };
}

function findBusinessNode(graph: ReturnType<typeof organizationGraph>) {
  const node = (graph["@graph"] as unknown as Record<string, unknown>[]).find(
    (n) => n["@id"] && String(n["@id"]).endsWith("#business"),
  );
  if (!node) throw new Error("Business node not found in @graph");
  return node;
}

describe("organizationGraph — R-02 wiring", () => {
  it("suppresses aggregateRating for a stub tenant (fetchedAt null)", () => {
    const cfg = makeCfg({ fetchedAt: null, aggregate: { ratingValue: 4.9, reviewCount: 120 }, reviews: [] });
    const biz = findBusinessNode(organizationGraph("fr", { name: "Test", description: "D" }, cfg));
    expect("aggregateRating" in biz).toBe(false);
  });

  it("emits aggregateRating from reviewData.aggregate when the gate passes (count = 5)", () => {
    const cfg = makeCfg({ fetchedAt: "2026-01-01T00:00:00Z", aggregate: { ratingValue: 4.7, reviewCount: 5 }, reviews: [] });
    const biz = findBusinessNode(organizationGraph("fr", { name: "Test", description: "D" }, cfg));
    const rating = biz["aggregateRating"] as { ratingValue: number; reviewCount: number };
    expect(rating).toBeDefined();
    expect(rating.ratingValue).toBe(4.7);
    expect(rating.reviewCount).toBe(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/lib/reviews-r02-gate.test.ts`
Expected: FAIL — `OrgGraphConfig` is not exported from `@/lib/seo`.

- [ ] **Step 3: Remove `reviewData?` from `SeoConfig`**

In `src/lib/seo.ts`, find the `SeoConfig` type (lines 45-53):

```ts
export type SeoConfig = {
  site: TenantSite;
  locations: Location[];
  reviewData?: {
    fetchedAt: string | null;
    aggregate: { ratingValue: number; reviewCount: number };
    reviews: readonly unknown[];
  };
};
```

Replace it with:

```ts
export type SeoConfig = {
  site: TenantSite;
  locations: Location[];
};

/** organizationGraph needs review honesty data on top of the shared SeoConfig.
 *  reviewData is REQUIRED — no default — so the compiler forces prod to supply
 *  it (previously an optional `??` default silently used static build-time data). */
export type OrgGraphConfig = SeoConfig & { reviewData: ReviewData };
```

- [ ] **Step 4: Delete the now-obsolete `reviewNodes` function**

In `src/lib/seo.ts`, delete the entire `reviewNodes` function and its doc comment (the block from the `/** Individual schema.org Review nodes ... */` comment through the closing `}`, originally lines 89-116). Its logic now lives in `reviewSchemaFragment`.

- [ ] **Step 5: Fix the `@/lib/reviews` import (drop the gate singletons)**

In `src/lib/seo.ts`, find line 27:

```ts
import { reviewsFetchedAt, aggregate, reviews, type Review } from "@/lib/reviews";
```

Replace with (keep only the display type used by the fragment):

```ts
import { type Review } from "@/lib/reviews";
```

- [ ] **Step 6: Change the `organizationGraph` signature to required `OrgGraphConfig`**

In `src/lib/seo.ts`, find the signature (~lines 218-222):

```ts
export function organizationGraph(
  lang: Locale,
  { name, description }: { name: string; description: string },
  cfg: SeoConfig = { site, locations },
): SeoGraph {
```

Replace with (no default — `cfg` is now required):

```ts
export function organizationGraph(
  lang: Locale,
  { name, description }: { name: string; description: string },
  cfg: OrgGraphConfig,
): SeoGraph {
```

- [ ] **Step 7: Replace the inline gate + reviewNodes spread with the fragment**

In `src/lib/seo.ts`, inside the business node object, find this block (originally ~302-325) — the AggregateRating IIFE plus the `...reviewNodes(cfg)` spread:

```ts
        // R-02 gate: only emit AggregateRating once real reviews have been
        // fetched (fetchedAt set) AND the fetched aggregate has at least 5
        // reviews. The authoritative count comes from reviewData.aggregate
        // (fetched data), NOT from cfg.site.reviews (static display config).
        // Suppressing stub data keeps the JSON-LD honest (T-02-01).
        // cfg.reviewData overrides the module singleton for DI in tests.
        ...((() => {
          const rd = cfg.reviewData ?? { fetchedAt: reviewsFetchedAt, aggregate };
          const hasRealRating =
            rd.fetchedAt !== null && rd.aggregate.reviewCount >= 5;
          return hasRealRating
            ? {
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: rd.aggregate.ratingValue,
                  reviewCount: rd.aggregate.reviewCount,
                  bestRating: cfg.site.reviews.bestRating,
                },
              }
            : {};
        })()),
        // Individual Review nodes — gated identically to AggregateRating (R-02):
        // only real fetched review bodies, never the static placeholder copy.
        ...reviewNodes(cfg),
```

Replace the whole block with a single spread:

```ts
        // Review honesty (R-02) — AggregateRating + Review nodes, both gated by
        // the shared predicates in @/config/review-honesty. Emits nothing until
        // a genuine fetch exists (T-02-01). reviewData is required on
        // OrgGraphConfig, so there is exactly one path (no static-default fork).
        ...reviewSchemaFragment({
          reviewData: cfg.reviewData,
          bestRating: cfg.site.reviews.bestRating,
        }),
```

- [ ] **Step 8: Run the wiring test to verify it passes**

Run: `bun test src/lib/reviews-r02-gate.test.ts`
Expected: PASS — 2 tests pass.

- [ ] **Step 9: Run the full seo test file to catch regressions**

Run: `bun test src/lib/seo.test.ts src/lib/review-schema-fragment.test.ts`
Expected: PASS. If `seo.test.ts` constructs `organizationGraph(...)` without `reviewData`, add `reviewData: { fetchedAt: null, aggregate: { ratingValue: 0, reviewCount: 0 }, reviews: [] }` to those `cfg` objects (a stub emits no rating — matches prior default behavior).

- [ ] **Step 10: Confirm no other caller of `organizationGraph` broke**

Run: `grep -rn "organizationGraph(" src --include=*.ts --include=*.tsx | grep -v ".test."`
Expected: only `src/lib/seo.ts` (definition) and `src/app/[lang]/layout.tsx` (fixed in Task 4). Any other hit is a caller that now needs `reviewData` — note it for Task 4.

- [ ] **Step 11: Commit**

```bash
git add src/lib/seo.ts src/lib/reviews-r02-gate.test.ts
git commit -m "refactor(seo): organizationGraph uses reviewSchemaFragment; reviewData now required (kills the ?? fork)"
```

---

## Task 4: Fix the production call site

**Files:**
- Modify: `src/app/[lang]/layout.tsx` (imports; `organizationGraph` call ~98-101)

- [ ] **Step 1: Verify the current call fails to type-check**

Run: `bunx tsc --noEmit -p tsconfig.json`
Expected: FAIL — an error at `src/app/[lang]/layout.tsx` around the `organizationGraph(...)` call: `reviewData` is missing in the config argument. This error is the fork made visible — exactly what we want.

- [ ] **Step 2: Add the imports**

In `src/app/[lang]/layout.tsx`, find the seo import (line 18):

```ts
import { organizationGraph } from "@/lib/seo";
```

Add directly after it:

```ts
import { tenant } from "@/config";
import { reviewDataFor } from "@/config/review-honesty";
```

(If `tenant` is already imported from `@/config` elsewhere in the file, merge into that import instead of adding a duplicate — check with `grep -n 'from "@/config"' src/app/[lang]/layout.tsx`.)

- [ ] **Step 3: Pass reviewData into the call**

In `src/app/[lang]/layout.tsx`, find the call (lines 98-101):

```tsx
          data={organizationGraph(lang, {
            name: site.name,
            description: seo.org.description,
          }, { site, locations })}
```

Replace with:

```tsx
          data={organizationGraph(lang, {
            name: site.name,
            description: seo.org.description,
          }, { site, locations, reviewData: reviewDataFor(tenant) })}
```

- [ ] **Step 4: Verify the type error is gone**

Run: `bunx tsc --noEmit -p tsconfig.json`
Expected: PASS — no errors (or only pre-existing errors unrelated to this change; the `layout.tsx` `reviewData` error is gone).

- [ ] **Step 5: Commit**

```bash
git add src/app/[lang]/layout.tsx
git commit -m "fix(seo): supply required reviewData at the layout call site via reviewDataFor(tenant)"
```

---

## Task 5: Validator crosses the same predicate

**Files:**
- Modify: `src/config/schema-invariants.ts` (import near line 32; export + rewrite `checkAggregateRating` ~615-640)
- Test: `src/config/schema-invariants.test.ts` (append a focused test)

`checkAggregateRating` currently re-states the gate inversely and hard-codes the intent in prose. Make it import and assert the SHARED predicate so it can never drift from the builder, and single-source the threshold via `RATING_MIN_REVIEWS`.

**Part A (prerequisite):** Task 3 removed `reviewData` from `SeoConfig`, so this test file's existing `organizationGraph` cfg literals (typed `SeoConfig` but carrying `reviewData`) no longer typecheck, and it has a duplicate `faqPageGraph` import. Before Part B, retype those literals + `tenantSeoConfig`'s return to `OrgGraphConfig`, switch `import type { SeoConfig }` to `OrgGraphConfig`, and delete the duplicate `import { faqPageGraph }`. Target: `tsc` reports zero `schema-invariants.test.ts` errors (only the environment-wide `bun:test` resolution note remains).

- [ ] **Step 1: Write the failing test**

Append to `src/config/schema-invariants.test.ts`:

```ts
import {
  checkAggregateRating as _checkAggregateRating,
} from "@/config/schema-invariants";
import type { ReviewData } from "@/config/types";

const cfgWith = (reviewData: ReviewData) =>
  ({ reviewData } as unknown as Parameters<typeof _checkAggregateRating>[1]);

describe("checkAggregateRating — shared-predicate assertion", () => {
  it("flags a stub that advertises a non-zero count (fetchedAt null, count > 0)", () => {
    const errors = _checkAggregateRating("t", cfgWith({
      fetchedAt: null,
      aggregate: { ratingValue: 4.9, reviewCount: 7 },
      reviews: [],
    }));
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].invariant).toBe("R-02");
  });

  it("passes a clean stub (fetchedAt null, count 0)", () => {
    const errors = _checkAggregateRating("t", cfgWith({
      fetchedAt: null,
      aggregate: { ratingValue: 0, reviewCount: 0 },
      reviews: [],
    }));
    expect(errors).toEqual([]);
  });

  it("passes a genuine fetch above the shared minimum", () => {
    const errors = _checkAggregateRating("t", cfgWith({
      fetchedAt: "2026-01-01T00:00:00Z",
      aggregate: { ratingValue: 4.8, reviewCount: 30 },
      reviews: [{}],
    }));
    expect(errors).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/config/schema-invariants.test.ts`
Expected: FAIL — `checkAggregateRating` is not exported from `@/config/schema-invariants`.

- [ ] **Step 3: Add the shared import**

In `src/config/schema-invariants.ts`, find line 32:

```ts
import { TENANT_REGISTRY } from "./index";
```

Add directly after it:

```ts
import { shouldPublishRating, RATING_MIN_REVIEWS } from "./review-honesty";
```

- [ ] **Step 4: Export and rewrite `checkAggregateRating`**

In `src/config/schema-invariants.ts`, replace the whole `checkAggregateRating` function (lines 615-640) with:

```ts
export function checkAggregateRating(tenantId: string, cfg: TenantEntry): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = [];
  const rd = cfg.reviewData;

  // Data hygiene: a stub (no genuine fetch) must not advertise a rating count —
  // it is misleading config even though the gate suppresses the rating.
  if (rd.fetchedAt === null && rd.aggregate.reviewCount > 0) {
    errors.push(
      err(
        tenantId,
        "R-02",
        `reviewData.fetchedAt is null but reviewCount=${rd.aggregate.reviewCount} > 0 — stub state inconsistency`,
      ),
    );
  }

  // Cross-check the SHARED gate the builder uses: a stub must never publish a
  // rating. Asserting through shouldPublishRating (not a re-stated threshold)
  // means the validator and the builder can never drift on the R-02 rule.
  if (rd.fetchedAt === null && shouldPublishRating(rd)) {
    errors.push(
      err(
        tenantId,
        "R-02",
        `stub tenant would publish a rating — the R-02 gate (min ${RATING_MIN_REVIEWS}) failed to suppress`,
      ),
    );
  }

  // A genuine fetch with a negative count is invalid data.
  if (rd.fetchedAt !== null && rd.aggregate.reviewCount < 0) {
    errors.push(err(tenantId, "R-02", `reviewCount=${rd.aggregate.reviewCount} is negative — invalid review count`));
  }

  return errors;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun test src/config/schema-invariants.test.ts`
Expected: PASS — all tests, including the 3 new ones.

- [ ] **Step 6: Verify the validator is still alias-free**

Run: `grep -n 'from "@/' src/config/schema-invariants.ts`
Expected: NO output (the new import is relative `./review-honesty`; only comments may mention `@/`).

- [ ] **Step 7: Commit**

```bash
git add src/config/schema-invariants.ts src/config/schema-invariants.test.ts
git commit -m "refactor(seo): checkAggregateRating asserts the shared R-02 predicate (no drift)"
```

---

## Task 6: Shrink `reviews.ts` to display-only + full verification

**Files:**
- Modify: `src/lib/reviews.ts` (remove the two now-dead gate exports)

The gate no longer reads `reviews.ts`; only display components do (`Testimonials.tsx`, `reviews/page.tsx` use `reviews`; `ReviewCard.tsx` uses `Review`). Remove the dead singletons `aggregate` and `reviewsFetchedAt`.

- [ ] **Step 1: Confirm the gate exports are now dead**

Run: `grep -rn "reviewsFetchedAt\|\baggregate\b" src --include=*.ts --include=*.tsx | grep "lib/reviews" ; grep -rn "import .*\b\(aggregate\|reviewsFetchedAt\)\b.* from \"@/lib/reviews\"" src`
Expected: NO importers of `aggregate` / `reviewsFetchedAt` remain (Task 3 removed the seo.ts import). If any hit appears, stop and migrate that caller to `@/config/review-honesty` first.

- [ ] **Step 2: Remove the dead exports**

In `src/lib/reviews.ts`, delete the `aggregate` export (lines 19-22) and the `reviewsFetchedAt` export (lines 24-27), leaving only the `Review` type and the `reviews` list:

```ts
import type { Locale } from "@/lib/i18n";
import { tenant } from "@/config";

export type Review = {
  id: string;
  author: string;
  /** Rating 1–5 (only 5★ reviews are stored in fetched data) */
  rating: number;
  dateISO: string; // "2025-11-03"
  lang: Locale;
  text: string;
};

// Per-tenant Google review BODIES for display (Testimonials, /reviews). The
// honesty gate for structured data lives in @/config/review-honesty — this
// module is display-only. The stub scaffold has reviews:[] until a fetch runs.
export const reviews: readonly Review[] = tenant.reviewData.reviews as readonly Review[];
```

- [ ] **Step 3: Run the full test suite**

Run: `bun test src/`
Expected: PASS — all tests green (honesty core, fragment, wiring, validator, plus the existing suite).

- [ ] **Step 4: Type-check the whole project**

Run: `bunx tsc --noEmit -p tsconfig.json`
Expected: PASS — no new type errors.

- [ ] **Step 5: Verify the build guard still runs (schema-invariants loads through the SWC hook)**

Run: `bun run build`
Expected: `next build` completes; no `MODULE_NOT_FOUND` from the schema-invariants require-hook and no R-02 invariant failure. (This proves the new alias-free `./review-honesty` import resolves inside the build guard.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/reviews.ts
git commit -m "refactor(seo): shrink reviews.ts to display-only (gate data now owned by review-honesty)"
```

---

## Self-Review checklist (already applied)

- **Spec coverage:** honesty core (T1) · fragment (T2) · required-config rewire + fork removal (T3) · prod call site (T4) · validator crosses shared predicate (T5) · reviews.ts display-only (T6). All grilled decisions covered.
- **Type consistency:** `ReviewData` / `TenantConfig` reused from `src/config/types.ts`; `OrgGraphConfig = SeoConfig & { reviewData }`; predicate names `shouldPublishRating` / `shouldPublishReviewNodes` / accessor `reviewDataFor` identical across T1, T2, T3, T5.
- **Alias-free invariant:** T1 Step 5 and T5 Step 6 grep-assert no `@/` runtime imports in the SWC-hook chain; T6 Step 5 build-verifies it end-to-end.
- **No placeholders:** every code step shows the full code and exact `bun test` / `tsc` / `grep` command with expected output.
