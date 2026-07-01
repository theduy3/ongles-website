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
