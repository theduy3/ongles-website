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
