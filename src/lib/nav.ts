import type { Locale } from "@/lib/i18n";
import type { TenantSite } from "@/config/types";

// Resolve a nav entry to a locale-prefixed href. Nav entries carry a default
// `href` plus optional per-locale overrides (`hrefByLocale`) for routes whose
// slug differs by locale (e.g. pricing: /tarifs ⇔ /pricing). This resolution —
// hrefByLocale[lang] ?? href ?? fallback, then a /{lang} prefix — was inlined
// verbatim on the home and service-detail pages. `fallback` is the path used
// when the key is absent (kept explicit so each caller states its own default).
export function navHref(
  lang: Locale,
  nav: TenantSite["nav"],
  key: string,
  fallback: string,
): string {
  const entry = nav.find((n) => n.key === key);
  return `/${lang}${entry?.hrefByLocale?.[lang] ?? entry?.href ?? fallback}`;
}
