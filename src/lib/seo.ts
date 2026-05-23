// Centralised SEO helpers: per-page Metadata (canonical + hreflang + OpenGraph)
// and schema.org JSON-LD builders. Single source of truth so every page emits a
// consistent, machine-readable layer matching what Yoast gives WordPress competitors.
//
// All URL-based metadata fields here are RELATIVE — they compose against the
// `metadataBase` set once in the root layout, so the canonical origin lives in
// exactly one place (src/lib/site.ts `url`).

import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n";
import { locales, defaultLocale } from "@/lib/i18n";
import { site } from "@/lib/site";
import { locations, mapLink } from "@/lib/locations";
import { reviewsFetchedAt } from "@/lib/reviews";
import type { GalleryImage } from "@/lib/gallery";

// Default social-share image (absolute path; resolved against metadataBase).
const OG_IMAGE = "/images/hero.png";

// OpenGraph locale codes — Québec FR-first salon.
const OG_LOCALE: Record<Locale, string> = {
  fr: "fr_CA",
  en: "en_CA",
};

// schema.org wants full weekday names (or URLs); site.hours stores compact codes.
const DAY_NAME: Record<string, string> = {
  Mo: "Monday",
  Tu: "Tuesday",
  We: "Wednesday",
  Th: "Thursday",
  Fr: "Friday",
  Sa: "Saturday",
  Su: "Sunday",
};

/** hreflang map for a route that is IDENTICAL across locales (incl. x-default→fr). */
function languageAlternates(route: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const locale of locales) map[locale] = `/${locale}${route}`;
  map["x-default"] = `/${defaultLocale}${route}`;
  return map;
}

/** hreflang map for a route whose path DIFFERS per locale (localized slugs). */
function localizedAlternates(
  routeByLocale: Record<Locale, string>,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const locale of locales)
    map[locale] = `/${locale}${routeByLocale[locale]}`;
  map["x-default"] = `/${defaultLocale}${routeByLocale[defaultLocale]}`;
  return map;
}

/**
 * Per-page metadata fragment: canonical + reciprocal hreflang + OpenGraph/Twitter.
 * `route` is the locale-agnostic path WITHOUT the locale prefix ("" for home,
 * "/services", …). For pages with LOCALIZED slugs, pass `routeByLocale` (a per-
 * locale path map); it overrides `route` for canonical + hreflang.
 */
export function pageMetadata(
  lang: Locale,
  route: string,
  {
    title,
    description,
    routeByLocale,
  }: {
    title: string;
    description: string;
    routeByLocale?: Record<Locale, string>;
  },
): Metadata {
  const path = routeByLocale
    ? `/${lang}${routeByLocale[lang]}`
    : `/${lang}${route}`;
  const languages = routeByLocale
    ? localizedAlternates(routeByLocale)
    : languageAlternates(route);
  return {
    title,
    description,
    alternates: { canonical: path, languages },
    openGraph: {
      type: "website",
      locale: OG_LOCALE[lang],
      siteName: site.name,
      title,
      description,
      url: path,
      images: [{ url: OG_IMAGE }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE],
    },
  };
}

// ---------------------------------------------------------------------------
// JSON-LD builders. Each returns a plain object; the <JsonLd> component
// serialises it. Absolute URLs are required inside JSON-LD (no metadataBase
// composition here), so everything is prefixed with site.url.
// ---------------------------------------------------------------------------

const BUSINESS_ID = `${site.url}/#business`;
const WEBSITE_ID = `${site.url}/#website`;

function offer(price: number, priceTo?: number) {
  // When a real upper bound exists, emit an AggregateOffer price range
  // (lowPrice = base "from" price; highPrice = base + top add-on). Otherwise
  // a plain Offer with the single price.
  if (priceTo !== undefined && priceTo > price) {
    return {
      "@type": "AggregateOffer",
      lowPrice: price,
      highPrice: priceTo,
      priceCurrency: "CAD",
      availability: "https://schema.org/InStock",
    };
  }
  return {
    "@type": "Offer",
    price,
    priceCurrency: "CAD",
    availability: "https://schema.org/InStock",
  };
}

/** Sitewide LocalBusiness (NailSalon) + WebSite graph — render once in the layout. */
export function organizationGraph(
  lang: Locale,
  { name, description }: { name: string; description: string },
) {
  const openingHoursSpecification = site.hours.map((block) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: block.days.map((d) => DAY_NAME[d]),
    opens: block.opens,
    closes: block.closes,
  }));

  // One NailSalon node per physical location, linked to the brand as a
  // `department`. Each carries its own address, geo, phone and hours so search
  // engines understand each Ongles Maily salon location.
  const departments = locations.map((loc) => ({
    "@type": "NailSalon",
    "@id": `${site.url}/#location-${loc.id}`,
    name: `${site.name} — ${loc.name}`,
    parentOrganization: { "@id": BUSINESS_ID },
    url: mapLink(loc),
    telephone: loc.phoneHref.replace("tel:", ""),
    priceRange: site.priceRange,
    address: {
      "@type": "PostalAddress",
      streetAddress: loc.address.street,
      addressLocality: loc.address.city,
      addressRegion: loc.address.region,
      postalCode: loc.address.postalCode,
      addressCountry: loc.address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: loc.geo.lat,
      longitude: loc.geo.lng,
    },
    openingHoursSpecification: loc.hoursSpec.map((block) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: block.days.map((d) => DAY_NAME[d]),
      opens: block.opens,
      closes: block.closes,
    })),
  }));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NailSalon",
        "@id": BUSINESS_ID,
        name,
        description,
        url: site.url,
        telephone: site.contact.phoneHref.replace("tel:", ""),
        email: site.contact.email,
        image: `${site.url}${OG_IMAGE}`,
        priceRange: site.priceRange,
        department: departments.map((d) => ({ "@id": d["@id"] })),
        // Only emit AggregateRating once real reviews have been fetched from
        // Google (fetchedAt set). The placeholder scaffold has no genuine
        // totals, so we omit the rating markup rather than assert unverified
        // numbers — keeps the structured data honest.
        ...(reviewsFetchedAt
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: site.reviews.ratingValue,
                reviewCount: site.reviews.reviewCount,
                bestRating: site.reviews.bestRating,
              },
            }
          : {}),
        address: {
          "@type": "PostalAddress",
          streetAddress: site.contact.address.street,
          addressLocality: site.contact.address.city,
          addressRegion: site.contact.address.region,
          postalCode: site.contact.address.postalCode,
          addressCountry: site.contact.address.country,
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: site.geo.lat,
          longitude: site.geo.lng,
        },
        openingHoursSpecification,
        sameAs: site.socialProfiles,
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: site.url,
        name: site.name,
        inLanguage: OG_LOCALE[lang],
        publisher: { "@id": BUSINESS_ID },
      },
      ...departments,
    ],
  };
}

type ServiceItem = {
  name: string;
  description: string;
  price: number;
  priceTo?: number; // optional upper bound → AggregateOffer price range
  path?: string; // localized path, e.g. "/services/manucure"
};

/**
 * Services hub graph: an ItemList of Service nodes, each linked to the business
 * and carrying a CAD Offer. Used on the /services overview page.
 */
export function servicesGraph(lang: Locale, items: readonly ServiceItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, i) => ({
      "@type": "Service",
      position: i + 1,
      name: item.name,
      description: item.description,
      ...(item.path ? { url: `${site.url}/${lang}${item.path}` } : {}),
      provider: { "@id": BUSINESS_ID },
      areaServed: site.contact.address.city,
      offers: offer(item.price, item.priceTo),
    })),
  };
}

/** Single Service node + Offer for an individual service page. */
export function serviceGraph(
  lang: Locale,
  { name, description, price, priceTo, path }: ServiceItem,
) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    ...(path ? { url: `${site.url}/${lang}${path}` } : {}),
    provider: { "@id": BUSINESS_ID },
    areaServed: site.contact.address.city,
    offers: offer(price, priceTo),
  };
}

/** FAQPage — render on /faq. Feeds Google rich results / AI answers. */
export function faqPageGraph(items: readonly { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

/** ImageGallery + ImageObject[] — render on /gallery. */
export function imageGalleryGraph(
  name: string,
  images: readonly GalleryImage[],
  textFor: (id: string) => { alt: string; caption: string },
) {
  return {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    name,
    image: images.map((img) => {
      const t = textFor(img.id);
      return {
        "@type": "ImageObject",
        contentUrl: `${site.url}${img.file}`,
        name: t.alt,
        caption: t.caption,
      };
    }),
  };
}

/** BreadcrumbList for a sub-page (Home → … → leaf). */
export function breadcrumbGraph(
  lang: Locale,
  crumbs: { name: string; route: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: `${site.url}/${lang}${crumb.route}`,
    })),
  };
}
