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

// Per-tenant Google reviews, fetched by scripts/fetch-google-reviews.mjs and
// stored in src/config/tenants/{id}/google-reviews.json.
// The stub scaffold has reviews:[] until a genuine fetch runs.
export const reviews: readonly Review[] = tenant.reviewData.reviews as readonly Review[];

// TRUE Google totals (averageRating / totalReviewCount), independent of 5★ filter.
// Backs the R-02 gate in seo.ts (authoritative fetched count, not static config).
export const aggregate: { ratingValue: number; reviewCount: number } =
  tenant.reviewData.aggregate;

// ISO timestamp set when fetch-google-reviews.mjs last ran successfully.
// null = stub / never fetched. The R-02 gate in seo.ts requires this to be
// non-null AND aggregate.reviewCount >= 5 before emitting AggregateRating.
export const reviewsFetchedAt: string | null = tenant.reviewData.fetchedAt;
