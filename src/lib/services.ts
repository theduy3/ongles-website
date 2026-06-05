// Service registry helpers. The service DATA now lives per-tenant in
// src/config/tenants/<id>/services.ts and is re-exported here under the stable
// "@/lib/services" import path. The Service/ServiceId TYPES live in
// src/config/types.ts; the helpers below stay here (logic, not data).

import { locales, type Locale } from "@/lib/i18n";
import { services } from "@/config";
import type { Service, ServiceId } from "@/config/types";

export type { Service, ServiceId };
export { services };

/** All slugs for one locale — feeds generateStaticParams (current locale only). */
export function slugParams(lang: Locale): { slug: string }[] {
  return services.map((s) => ({ slug: s.slug[lang] }));
}

/** Resolve a localized slug back to its service, or undefined (→ 404). */
export function serviceBySlug(lang: Locale, slug: string): Service | undefined {
  return services.find((s) => s.slug[lang] === slug);
}

/** Localized path for a service in a given locale, e.g. "/services/gel-nails". */
export function servicePath(service: Service, lang: Locale): string {
  return `/services/${service.slug[lang]}`;
}

/** Per-locale path map for a service — feeds pageMetadata's hreflang/canonical. */
export function servicePathsByLocale(service: Service): Record<Locale, string> {
  return Object.fromEntries(
    locales.map((l) => [l, `/services/${service.slug[l]}`]),
  ) as Record<Locale, string>;
}
