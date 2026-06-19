// Centralised SEO helpers: per-page Metadata (canonical + hreflang + OpenGraph)
// and schema.org JSON-LD builders. Single source of truth so every page emits a
// consistent, machine-readable layer matching what Yoast gives WordPress competitors.
//
// All URL-based metadata fields here are RELATIVE — they compose against the
// `metadataBase` set once in the root layout, so the canonical origin lives in
// exactly one place (src/lib/site.ts `url`).

import type { Metadata } from "next";
import type {
  NailSalon,
  WebSite,
  Organization,
  Service as SchemaService,
  FAQPage,
  BreadcrumbList,
  ItemList,
  ImageGallery,
  WithContext,
  AggregateOffer,
  Offer,
} from "schema-dts";
import type { Locale } from "@/lib/i18n";
import { locales, defaultLocale } from "@/lib/i18n";
import { site } from "@/lib/site";
import { locations, mapLink } from "@/lib/locations";
import { reviewsFetchedAt, aggregate } from "@/lib/reviews";
import type { GalleryImage } from "@/lib/gallery";
import type { TenantSite, Location } from "@/config/types";

/**
 * Local graph wrapper type for organizationGraph — schema-dts 2.0.0 does not
 * export a @graph-wrapped root type; we define it locally to carry the
 * compile-time type without changing the runtime shape.
 */
interface SeoGraph {
  "@context": "https://schema.org";
  "@graph": Array<NailSalon | WebSite | Organization>;
}

/** Injected store config for SEO builders. Callers that pass this override the
 *  static module-level defaults — enabling live DB config to flow through.
 *  `reviewData` is optional: when present it overrides the module-level singleton
 *  from reviews.ts (used in tests for isolated R-02 gate verification). */
export type SeoConfig = {
  site: TenantSite;
  locations: Location[];
  reviewData?: {
    fetchedAt: string | null;
    aggregate: { ratingValue: number; reviewCount: number };
    reviews: readonly unknown[];
  };
};

// Default social-share image (absolute path; resolved against metadataBase).
// JPEG (not WebP) for universal social-scraper compatibility.
const OG_IMAGE = "/images/og.jpg";

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
  cfg: SeoConfig = { site, locations },
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
      siteName: cfg.site.name,
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

// NOTE: BUSINESS_ID and WEBSITE_ID are computed per-call inside builders that
// accept an injected SeoConfig, so the site.url can be overridden at runtime.

function offer(price: number, priceTo?: number): AggregateOffer | Offer {
  // When a real upper bound exists, emit an AggregateOffer price range
  // (lowPrice = base "from" price; highPrice = base + top add-on). Otherwise
  // a plain Offer with the single price.
  // Casts required: schema-dts expects literal "@type" strings narrower than
  // what TypeScript infers from object literals. Runtime shape is unchanged.
  if (priceTo !== undefined && priceTo > price) {
    return {
      "@type": "AggregateOffer",
      lowPrice: price,
      highPrice: priceTo,
      priceCurrency: "CAD",
      availability: "https://schema.org/InStock",
    } as unknown as AggregateOffer;
  }
  return {
    "@type": "Offer",
    price,
    priceCurrency: "CAD",
    availability: "https://schema.org/InStock",
  } as unknown as Offer;
}

/** Sitewide LocalBusiness (NailSalon) + WebSite graph — render once in the layout. */
export function organizationGraph(
  lang: Locale,
  { name, description }: { name: string; description: string },
  cfg: SeoConfig = { site, locations },
): SeoGraph {
  // All @id URIs derive from canonicalUrl (stable production origin, I-01).
  // Human-facing `url:` fields on nodes remain cfg.site.url (runtime-overridable).
  const CANONICAL = cfg.site.canonicalUrl;
  const ORGANIZATION_ID = `${CANONICAL}/#organization`;
  const BUSINESS_ID = `${CANONICAL}/#business`;
  const WEBSITE_ID = `${CANONICAL}/#website`;

  const openingHoursSpecification = cfg.site.hours.map((block) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: block.days.map((d) => DAY_NAME[d]),
    opens: block.opens,
    closes: block.closes,
  }));

  // One NailSalon node per physical location, linked to the brand as a
  // `department`. Each carries its own address, geo, phone and hours so search
  // engines understand each salon location.
  const departments = cfg.locations.map((loc) => ({
    "@type": "NailSalon",
    "@id": `${CANONICAL}/#location-${loc.id}`,
    name: `${cfg.site.name} — ${loc.name}`,
    parentOrganization: { "@id": BUSINESS_ID },
    url: mapLink(loc, cfg.site),
    telephone: loc.phoneHref.replace("tel:", ""),
    priceRange: cfg.site.priceRange,
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

  // I-03: only emit sameAs when socialProfiles is non-empty; never sameAs: [].
  const sameAsSpread =
    cfg.site.socialProfiles.length > 0
      ? { sameAs: cfg.site.socialProfiles }
      : {};

  // Cast required: internal objects use string-inferred @type literals; schema-dts
  // expects literal string union types. Runtime shape is identical (no behavioral change).
  return {
    "@context": "https://schema.org",
    "@graph": [
      // O-01: top-level brand Organization node — first @graph member.
      // Locations/business link back via parentOrganization.
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        name: cfg.site.name,
        url: cfg.site.canonicalUrl,
        ...sameAsSpread,
      },
      {
        "@type": "NailSalon",
        "@id": BUSINESS_ID,
        name,
        description,
        url: cfg.site.url,
        telephone: cfg.site.contact.phoneHref.replace("tel:", ""),
        email: cfg.site.contact.email,
        image: `${cfg.site.url}${OG_IMAGE}`,
        priceRange: cfg.site.priceRange,
        // O-01: link this business node to the brand Organization.
        parentOrganization: { "@id": ORGANIZATION_ID },
        department: departments.map((d) => ({ "@id": d["@id"] })),
        // R-02 gate: only emit AggregateRating once real reviews have been
        // fetched (fetchedAt set) AND the fetched aggregate has at least 5
        // reviews. The authoritative count comes from reviewData.aggregate
        // (fetched data), NOT from cfg.site.reviews (static display config).
        // Suppressing stub data keeps the JSON-LD honest (T-02-01).
        // cfg.reviewData overrides the module singleton for DI in tests.
        ...((() => {
          const rd = cfg.reviewData ?? { fetchedAt: reviewsFetchedAt, aggregate };
          const hasRealRating =
            rd.fetchedAt !== null && rd.aggregate.reviewCount >= 5;
          return hasRealRating
            ? {
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: rd.aggregate.ratingValue,
                  reviewCount: rd.aggregate.reviewCount,
                  bestRating: cfg.site.reviews.bestRating,
                },
              }
            : {};
        })()),
        address: {
          "@type": "PostalAddress",
          streetAddress: cfg.site.contact.address.street,
          addressLocality: cfg.site.contact.address.city,
          addressRegion: cfg.site.contact.address.region,
          postalCode: cfg.site.contact.address.postalCode,
          addressCountry: cfg.site.contact.address.country,
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: cfg.site.geo.lat,
          longitude: cfg.site.geo.lng,
        },
        openingHoursSpecification,
        ...sameAsSpread,
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: cfg.site.url,
        name: cfg.site.name,
        inLanguage: OG_LOCALE[lang],
        publisher: { "@id": BUSINESS_ID },
      },
      ...departments,
    ],
  } as unknown as SeoGraph;
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
export function servicesGraph(
  lang: Locale,
  items: readonly ServiceItem[],
  cfg: SeoConfig = { site, locations },
): WithContext<ItemList> {
  // Use canonicalUrl so the provider @id resolves to the same stable business node (I-01).
  const BUSINESS_ID = `${cfg.site.canonicalUrl}/#business`;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, i) => ({
      "@type": "Service",
      position: i + 1,
      name: item.name,
      description: item.description,
      ...(item.path ? { url: `${cfg.site.url}/${lang}${item.path}` } : {}),
      provider: { "@id": BUSINESS_ID },
      areaServed: cfg.site.contact.address.city,
      offers: offer(item.price, item.priceTo),
    })),
  } as unknown as WithContext<ItemList>;
}

/** Single Service node + Offer for an individual service page. */
export function serviceGraph(
  lang: Locale,
  { name, description, price, priceTo, path }: ServiceItem,
  cfg: SeoConfig = { site, locations },
): WithContext<SchemaService> {
  // Use canonicalUrl so the provider @id resolves to the same stable business node (I-01).
  const BUSINESS_ID = `${cfg.site.canonicalUrl}/#business`;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    ...(path ? { url: `${cfg.site.url}/${lang}${path}` } : {}),
    provider: { "@id": BUSINESS_ID },
    areaServed: cfg.site.contact.address.city,
    offers: offer(price, priceTo),
  } as unknown as WithContext<SchemaService>;
}

/**
 * Pricing hub graph — named entry point for the /tarifs page (Phase 4).
 *
 * Delegates to servicesGraph() unchanged so every Phase 2 offer() invariant
 * (AggregateOffer when priceTo > price, Offer otherwise — SCHEMA-02) is
 * preserved without duplicating logic. Phase 2 builders are untouched (D-28).
 *
 * @param lang - Locale ("fr" | "en")
 * @param items - Services to list on the pricing page
 * @param cfg - Optional SeoConfig (defaults to module-level site/locations)
 */
export function pricingGraph(
  lang: Locale,
  items: readonly ServiceItem[],
  cfg?: SeoConfig,
): WithContext<ItemList> {
  return servicesGraph(lang, items, cfg);
}

/** FAQPage — render on /faq. Feeds Google rich results / AI answers. */
export function faqPageGraph(items: readonly { q: string; a: string }[]): WithContext<FAQPage> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  } as unknown as WithContext<FAQPage>;
}

/** ImageGallery + ImageObject[] — render on /gallery. */
export function imageGalleryGraph(
  name: string,
  images: readonly GalleryImage[],
  textFor: (id: string) => { alt: string; caption: string },
  cfg: SeoConfig = { site, locations },
): WithContext<ImageGallery> {
  return {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    name,
    image: images.map((img) => {
      const t = textFor(img.id);
      return {
        "@type": "ImageObject",
        contentUrl: `${cfg.site.url}${img.file}`,
        name: t.alt,
        caption: t.caption,
      };
    }),
  } as unknown as WithContext<ImageGallery>;
}

/** BreadcrumbList for a sub-page (Home → … → leaf). */
export function breadcrumbGraph(
  lang: Locale,
  crumbs: { name: string; route: string }[],
  cfg: SeoConfig = { site, locations },
): WithContext<BreadcrumbList> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: `${cfg.site.url}/${lang}${crumb.route}`,
    })),
  } as unknown as WithContext<BreadcrumbList>;
}
