import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";
import { site } from "@/lib/site";
import { services, servicePath } from "@/lib/services";

// Single-locale sitemap (en). The header nav is now anchor links into the home
// page, so indexable routes come from site.routes + the service slugs + home.
// Each entry declares hreflang alternates for App Router parity (one locale).
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const altLanguages = (path: string) =>
    Object.fromEntries(locales.map((l) => [l, `${site.url}/${l}${path}`]));

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
    services.map((service) => ({
      url: `${site.url}/${locale}${servicePath(service, locale)}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.6,
      alternates: { languages: altLanguages(servicePath(service, locale)) },
    })),
  );

  return [...homeEntries, ...pageEntries, ...serviceEntries];
}
