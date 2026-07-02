import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";
import { servicePath, servicePathsByLocale } from "@/lib/services";
import { COMPARISONS, comparisonPathsByLocale } from "@/lib/comparisons";
import { pricingPathsByLocale } from "@/lib/routes";
import { getStoreConfig } from "@/lib/store-config";

// Single-locale sitemap (en). The header nav is now anchor links into the home
// page, so indexable routes come from site.routes + the service slugs + home.
// Each entry declares hreflang alternates for App Router parity (one locale).
//
// LOCALIZED_PAGE_PAIRS — explicit FR↔EN path pairs for routes whose slugs differ
// by locale (pricing: /tarifs vs /pricing; comparisons: /comparaisons/* vs /comparisons/*).
// Borough near-me routes use the same proper-noun slug in both locales (/beauport, etc.)
// and are emitted via site.routes using the standard pageEntries block.
//
// Per 04-05 plan: these localized routes must NOT be added to site.routes
// (they would be emitted with same-slug hreflang incorrectly). Instead we emit
// them here with an explicit alternates block matching serviceEntries pattern
// (Pitfall 2 from 04-RESEARCH Q6).

type LocalizedPathPair = { fr: string; en: string };

function buildLocalizedPageEntries(
  siteUrl: string,
  pairs: LocalizedPathPair[],
  lastModified: Date,
  defaultLocale: string,
): MetadataRoute.Sitemap {
  return pairs.flatMap(({ fr, en }) => {
    const pathByLocale: Record<string, string> = { fr, en };
    return locales.map((locale) => ({
      url: `${siteUrl}/${locale}${pathByLocale[locale]}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      alternates: {
        languages: {
          fr: `${siteUrl}/fr${fr}`,
          en: `${siteUrl}/en${en}`,
          "x-default": `${siteUrl}/${defaultLocale}${pathByLocale[defaultLocale]}`,
        },
      },
    }));
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { site, services } = await getStoreConfig();
  const lastModified = new Date();
  const defaultLocale = locales[0]; // fr is index 0 (the canonical default)
  const altLanguages = (path: string) => ({
    ...Object.fromEntries(locales.map((l) => [l, `${site.url}/${l}${path}`])),
    "x-default": `${site.url}/${defaultLocale}${path}`,
  });

  const homeEntries: MetadataRoute.Sitemap = locales.map((locale) => ({
    url: `${site.url}/${locale}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 1,
    alternates: { languages: altLanguages("") },
  }));

  const pageEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    site.routes.map((route) => ({
      url: `${site.url}/${locale}${route}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      alternates: { languages: altLanguages(route) },
    })),
  );

  const serviceEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    services.map((service) => {
      const pathsByLocale = servicePathsByLocale(service);
      return {
        url: `${site.url}/${locale}${servicePath(service, locale)}`,
        lastModified,
        changeFrequency: "monthly" as const,
        priority: 0.6,
        alternates: {
          languages: {
            ...Object.fromEntries(
              locales.map((l) => [l, `${site.url}/${l}${pathsByLocale[l]}`]),
            ),
            "x-default": `${site.url}/${defaultLocale}${pathsByLocale[defaultLocale]}`,
          },
        },
      };
    }),
  );

  // Localized route pairs: pricing page (/tarifs FR, /pricing EN)
  // and 4 comparison pages (FR /comparaisons/[slug], EN /comparisons/[slug]).
  // These use locale-distinct slugs so they cannot share the same-route pageEntries
  // pattern — each pair emits per-locale entries with explicit hreflang alternates.
  const LOCALIZED_PAGE_PAIRS: LocalizedPathPair[] = [
    pricingPathsByLocale(),
    ...COMPARISONS.map((c) => ({
      fr: `/comparaisons/${c.slug.fr}`,
      en: `/comparisons/${c.slug.en}`,
    })),
  ];

  // Verify comparisonPathsByLocale is used (its shape drives the pairs above).
  // This import is used to keep the module dependency explicit and avoid dead-import
  // stripping: the COMPARISONS array above uses c.slug directly, which is equivalent.
  void comparisonPathsByLocale;

  const localizedPageEntries = buildLocalizedPageEntries(
    site.url,
    LOCALIZED_PAGE_PAIRS,
    lastModified,
    defaultLocale,
  );

  return [...homeEntries, ...pageEntries, ...serviceEntries, ...localizedPageEntries];
}
