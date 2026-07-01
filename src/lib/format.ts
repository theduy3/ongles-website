// Price formatting. Single source so service cards and detail pages render
// prices identically. CAD amounts, so the symbol always prefixes.

import type { Locale } from "@/lib/i18n";

/** Bare price, e.g. "$50". */
export function formatPrice(_lang: Locale, price: number): string {
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
// rating identically. `lang` is accepted for a future fr-CA switch, but today
// we pin en-CA to preserve current behavior (both fr and en pages render en-CA
// — see call sites). Rating is pinned to exactly one decimal (min AND max), so
// callers can't diverge the way toFixed(1) and toLocaleString(min:1) once did.
export function formatRating(_lang: Locale, value: number): string {
  return value.toLocaleString("en-CA", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/** Review count with thousands grouping, e.g. 1234 → "1,234". */
export function formatReviewCount(_lang: Locale, count: number): string {
  return count.toLocaleString("en-CA");
}
