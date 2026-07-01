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
