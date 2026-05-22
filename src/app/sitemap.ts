import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";
import { site } from "@/lib/site";
import { services, servicePath } from "@/lib/services";

// Single-locale sitemap (en). Nav + secondary routes share a path; service pages
// use their slug. Each entry still declares hreflang alternates for parity with
// the App Router shape (one locale today).
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  // Skip in-page anchors (e.g. "/#giftcards") — not standalone documents.
  const toPath = (href: string) => (href === "/" ? "" : href);
  const isPage = (href: string) => !href.includes("#");

  const altLanguages = (path: string) =>
    Object.fromEntries(locales.map((l) => [l, `${site.url}/${l}${path}`]));

  const navEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    site.nav.map((item) => ({
      url: `${site.url}/${locale}${toPath(item.href)}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: item.href === "/" ? 1 : 0.8,
      alternates: { languages: altLanguages(toPath(item.href)) },
    })),
  );

  const serviceEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    services.map((service) => ({
      url: `${site.url}/${locale}${servicePath(service, locale)}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      alternates: { languages: altLanguages(servicePath(service, locale)) },
    })),
  );

  const secondaryEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    site.secondaryNav
      .filter((item) => isPage(item.href))
      .map((item) => ({
        url: `${site.url}/${locale}${toPath(item.href)}`,
        lastModified,
        changeFrequency: "monthly" as const,
        priority: 0.6,
        alternates: { languages: altLanguages(toPath(item.href)) },
      })),
  );

  return [...navEntries, ...secondaryEntries, ...serviceEntries];
}
