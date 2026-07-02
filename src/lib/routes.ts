/**
 * routes.ts — Localized-route owner.
 *
 * The single source for site-wide routes whose URL segment differs by locale
 * but whose target is one page. Same convention for every tenant (not tenant
 * data), so it lives here, not in per-tenant config. Mirrors the shape of the
 * Comparison registry (comparisons.ts):
 *   pricingPath(lang)        → locale-specific route path
 *   pricingPathsByLocale()   → { fr: ..., en: ... }
 *
 * Non-nav callers (both pricing pages, the comparison-page pricing link, the
 * sitemap) DERIVE their pricing path here instead of hardcoding /tarifs vs
 * /pricing, so the pair can't drift across call sites. The per-tenant nav
 * `hrefByLocale` override (site.ts, resolved by navItemHref) is a separate,
 * intentional seam and stays independent of this default.
 */

import { locales, type Locale } from "@/lib/i18n";

/** The one pricing-route convention: FR /tarifs, EN /pricing. */
const PRICING_ROUTE: Record<Locale, string> = { fr: "/tarifs", en: "/pricing" };

/** Return the locale-specific pricing route path. */
export function pricingPath(lang: Locale): string {
  return PRICING_ROUTE[lang];
}

/**
 * Return a map of all locale pricing paths.
 * Mirrors comparisonPathsByLocale from comparisons.ts.
 */
export function pricingPathsByLocale(): Record<Locale, string> {
  return Object.fromEntries(
    locales.map((l) => [l, pricingPath(l)]),
  ) as Record<Locale, string>;
}
