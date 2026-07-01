import type { Locale } from "@/lib/i18n";
import type { TenantSite } from "@/config/types";
import { formatRating, formatReviewCount } from "@/lib/format";
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

// Render-ready above-fold trust signal (rating + review count). Owns the
// display gate, the number format, and the aria-label in one place so the home
// and service-detail pages can't diverge (the service page had inlined
// toFixed while home used toLocaleString). Pure: `siteReviews` is the
// request-time resolved summary, `labels` are dict.reviews strings.
export type TrustSignal =
  | { show: false }
  | {
      show: true;
      ratingDisplay: string;
      bestRating: number;
      countDisplay: string;
      ariaLabel: string;
    };

export function trustSignals(
  lang: Locale,
  siteReviews: TenantSite["reviews"],
  labels: { basedOn: string; reviewsWord: string },
): TrustSignal {
  if (siteReviews.reviewCount <= 0) return { show: false };
  const ratingDisplay = formatRating(lang, siteReviews.ratingValue);
  const countDisplay = formatReviewCount(lang, siteReviews.reviewCount);
  const { bestRating } = siteReviews;
  return {
    show: true,
    ratingDisplay,
    bestRating,
    countDisplay,
    ariaLabel: `${ratingDisplay} / ${bestRating} — ${labels.basedOn} ${countDisplay} ${labels.reviewsWord}`,
  };
}
