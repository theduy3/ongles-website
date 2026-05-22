// i18n configuration. Pure Nail Bar is an English-only Vancouver salon, so the
// site ships a single locale. The [lang] route segment is kept (max parity with
// the parent SS-website App Router shape and an easy on-ramp for future locales),
// but `locales` holds only "en" today.

export const locales = ["en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

// Right-to-left locales. None today; kept for forward-compatibility.
export const rtlLocales: readonly Locale[] = [];
export function dirFor(locale: Locale): "rtl" | "ltr" {
  return rtlLocales.includes(locale) ? "rtl" : "ltr";
}

// Short display labels for a future language switcher.
export const localeLabel: Record<Locale, string> = {
  en: "EN",
};

export type LangParams = { params: Promise<{ lang: string }> };

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

// Pick the best supported locale from an Accept-Language header, honouring q
// weights, falling back to the default when nothing matches.
export function matchLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;

  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.toLowerCase(), q: q ? Number.parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return defaultLocale;
}
