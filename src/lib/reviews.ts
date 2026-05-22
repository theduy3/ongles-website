import type { Locale } from "@/lib/i18n";
import data from "@/data/google-reviews.json";

export type Review = {
  id: string;
  author: string; // first name + last initial (privacy)
  rating: number; // 1–5 (only 5★ are fetched)
  dateISO: string; // e.g. "2025-11-03"
  // Original language. The Business Profile API doesn't return it reliably, so
  // it's optional; text is shown verbatim regardless (no MT of user content).
  lang?: Locale;
  text: string;
};

// Real 5★ Google reviews, fetched at build time by scripts/fetch-google-reviews.mjs
// into src/data/google-reviews.json. Empty until the first fetch (display-only —
// these emit no per-review schema.org markup).
export const reviews: readonly Review[] = data.reviews as readonly Review[];

// TRUE Google totals (averageRating / totalReviewCount), independent of the 5★
// display filter. Backs the schema.org AggregateRating so it stays honest.
export const aggregate: { ratingValue: number; reviewCount: number } =
  data.aggregate;

// ISO timestamp of the last real Google fetch; null in the committed scaffold.
// Gates the schema.org AggregateRating so we never emit rating markup that
// isn't backed by a genuine fetch.
export const reviewsFetchedAt: string | null = data.fetchedAt;
