import type { Locale } from "@/lib/i18n";
import type { TenantSite } from "@/config/types";

// The one locale-slug rule. Nav entries carry a default `href` plus optional
// per-locale overrides (`hrefByLocale`) for routes whose slug differs by locale
// (e.g. pricing: /tarifs ⇔ /pricing). Resolution is hrefByLocale[lang] ?? href,
// then a /{lang} prefix (a bare "/" maps to /{lang}, no trailing slash).
//
// Two entry points share this rule: navItemHref for callers that already hold
// the item (Header maps over site.nav), navHref for callers that resolve by key
// (the home and service-detail pages). Both were once inlined verbatim.
export function navItemHref(
  lang: Locale,
  item: TenantSite["nav"][number],
): string {
  const path = item.hrefByLocale?.[lang] ?? item.href;
  return path === "/" ? `/${lang}` : `/${lang}${path}`;
}

// Resolve a nav entry by key, or the `fallback` path when the key is absent
// (kept explicit so each caller states its own default). Delegates to
// navItemHref so the by-key and by-item paths can't drift.
export function navHref(
  lang: Locale,
  nav: TenantSite["nav"],
  key: string,
  fallback: string,
): string {
  const entry = nav.find((n) => n.key === key);
  return navItemHref(lang, entry ?? { key, href: fallback });
}
