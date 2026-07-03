// Price formatting. Single source so service cards and detail pages render
// prices identically. CAD amounts, so the symbol always prefixes.

import type { Locale } from "@/lib/i18n";

/** Bare price, e.g. "$50". */
function formatPrice(_lang: Locale, price: number): string {
  return `$${price}`;
}

/**
 * Entry ("from") price — the base of the AggregateOffer range, shown to invite
 * rather than cap. `fromWord` is the label (dict.serviceLabels.priceFrom), e.g.
 * "from $50".
 */
export function formatFromPrice(
  lang: Locale,
  price: number,
  fromWord: string,
): string {
  return `${fromWord} ${formatPrice(lang, price)}`;
}

// Rating + review-count formatting. Single source so every caller renders a
// rating identically. Locale-aware (`${lang}-CA`): en-CA uses a dot decimal +
// comma grouping, fr-CA a comma decimal + non-breaking-space grouping — matching
// this Québec FR-first salon. Rating is pinned to exactly one decimal (min AND
// max) so callers can't diverge the way toFixed(1) and toLocaleString(min:1) did.
export function formatRating(lang: Locale, value: number): string {
  return value.toLocaleString(`${lang}-CA`, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/** Review count with locale-aware thousands grouping (e.g. en 1,234 / fr 1 234). */
export function formatReviewCount(lang: Locale, count: number): string {
  return count.toLocaleString(`${lang}-CA`);
}
