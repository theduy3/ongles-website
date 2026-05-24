// Canonical service registry — structural, locale-invariant. Mirrors the
// site.ts (structural) vs dictionaries (translatable) split: slugs, price and
// image flags live here; all prose lives in dict.serviceDetails[id].
//
// `id` is the stable key shared with dict.serviceDetails and used for image
// filenames (public/images/services/<id>.webp). Single-locale (en), so slugs are
// a Record keyed by Locale for parity with the parent App Router shape, but each
// service has exactly one slug today.

import { locales, type Locale } from "@/lib/i18n";

export type ServiceId =
  | "pose-ongles"
  | "remplissage"
  | "soins-mains"
  | "soins-pieds";

export type Service = {
  id: ServiceId;
  slug: Record<Locale, string>;
  price: number; // CAD — single source of truth (feeds Offer schema + display)
  // Upper bound for the AggregateOffer price range (base + top add-on).
  priceTo: number;
  // true once a real photo exists at public/images/services/<id>.webp.
  photo: boolean;
};

export const services: readonly Service[] = [
  {
    id: "pose-ongles",
    slug: { fr: "pose-d-ongles", en: "nail-enhancements" },
    price: 60,
    priceTo: 75,
    photo: true,
  },
  {
    id: "remplissage",
    slug: { fr: "remplissage", en: "fill" },
    price: 45,
    priceTo: 60,
    photo: true,
  },
  {
    id: "soins-mains",
    slug: { fr: "soins-des-mains", en: "manicure" },
    price: 30,
    priceTo: 40,
    photo: true,
  },
  {
    id: "soins-pieds",
    slug: { fr: "soins-des-pieds", en: "pedicure" },
    price: 35,
    priceTo: 60,
    photo: true,
  },
] as const;

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
