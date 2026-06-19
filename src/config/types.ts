// Tenant config types. A "tenant" is one branded salon (own domain, NAP, SEO).
// The active tenant is selected at BUILD time via process.env.TENANT and resolved
// in src/config/index.ts. Per-location physical data uses the Location type below,
// which is re-exported by src/lib/locations.ts for backward-compatible imports.

import type { Locale } from "@/lib/i18n";

export type DayHours = { label: string; value: string };

// A service offered by a tenant. Structural/locale-invariant: prose lives in
// dict.serviceDetails[id]. `id` is the stable key (also the image filename).
export type ServiceId =
  | "pose-ongles"
  | "remplissage"
  | "soins-mains"
  | "soins-pieds";

export type Service = {
  id: ServiceId;
  slug: Record<Locale, string>;
  price: number; // CAD — feeds Offer schema + display
  priceTo?: number; // optional upper bound for AggregateOffer range (absent → single price)
  photo: boolean; // true once public/images/services/<id>.webp exists
};

// A single FAQ entry. `a` is ALWAYS clean plain text so faqPageGraph's
// acceptedAnswer.text stays link-free (D-30); an optional `link` is rendered as a
// separate inline anchor by the Accordion, never spliced into `a`. Compatible with
// the base dictionaries `{q,a}` shape (link is optional).
export type FaqItem = {
  q: string;
  a: string;
  link?: { href: string; label: string };
};

export type Location = {
  id: string;
  name: string;
  slug: string;
  landmark?: string;
  address: {
    line1: string;
    line2: string;
    street: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  };
  phone: string;
  phoneHref: string;
  // Human-readable hours rows for the location card.
  hours: DayHours[];
  // schema.org OpeningHoursSpecification blocks (two-letter day codes, 24h).
  hoursSpec: { days: string[]; opens: string; closes: string }[];
  geo: { lat: number; lng: number };
  // Booker location slug → service-menu booking URL.
  bookerSlug: string;
};

// Structural shape of a tenant's locale-invariant brand facts. Mirrors the legacy
// `site` object. Sibling tenants (Phase 2+) annotate their config with this; the
// primary ongles-maily tenant keeps an `as const` literal to preserve the narrow
// literal types its consumers rely on (nav keys, route strings, brand name).
export type TenantSite = {
  name: string;
  url: string;
  /** Stable production origin for schema.org `@id` URIs. NEVER overridden by
   *  Supabase admin config — `canonicalUrl` is deliberately absent from
   *  `SiteSectionSchema` so the `.strict()` override surface rejects it (I-01).
   *  No trailing slash. Example: `"https://onglesmaily.com"`. */
  canonicalUrl: string;
  // Optional header logo image URL. Merged from the Supabase override; when
  // absent the header uses the static /images/logo.png default.
  logo?: string;
  // Optional favicon image URL. Merged from the Supabase override; when absent
  // the site uses the static app/icon.png default.
  favicon?: string;
  // SalonX widget store code (booking / check-in / queue widgets).
  storeId: string;
  // SalonX widget origin (no trailing slash), e.g. "https://app.onglesmaily.com".
  widgetHost: string;
  booking: string;
  booker: { brand: string; giftCertificate: string };
  socialProfiles: readonly string[];
  priceRange: string;
  reviews: {
    ratingValue: number;
    reviewCount: number;
    bestRating: number;
    source: string;
  };
  geo: { lat: number; lng: number };
  hours: readonly { days: readonly string[]; opens: string; closes: string }[];
  contact: {
    email: string;
    phone: string;
    phoneHref: string;
    landmark: string;
    address: {
      line1: string;
      line2: string;
      street: string;
      city: string;
      region: string;
      postalCode: string;
      country: string;
    };
  };
  /** GA4 measurement ID for this tenant's property (format: "G-XXXXXXXXXX").
   *  Empty string = no analytics configured for this tenant — guarded by
   *  checkGA4IdPresent() (warning-level, not a hard build fail).
   *  NEVER added to SiteSectionSchema — mirror canonicalUrl I-01 exclusion. */
  ga4MeasurementId: string;
  /** Hand-authored AI-discovery intro for this tenant's llms.txt.
   *  Must be ≥200 unique words, zero hardcoded references to other tenants'
   *  cities or landmarks. Guarded by checkLlmsDepth() + checkLlmsLeak()
   *  (wired in 05-05 once owner prose is authored).
   *  NEVER added to SiteSectionSchema — remote content injection is prohibited. */
  llmsDescription: string;
  nav: readonly {
    key: string;
    /** Default href (locale-prefixed by Header). Used for anchor links and same-slug routes. */
    href: string;
    /**
     * Optional per-locale override hrefs for routes whose slug differs by locale
     * (e.g. pricing: { fr: "/tarifs", en: "/pricing" }). When present, Header uses
     * hrefByLocale[activeLocale] instead of href. Locale-prefix still applied by Header.
     */
    hrefByLocale?: Partial<Record<string, string>>;
  }[];
  routes: readonly string[];
};

// Per-tenant review data. Written by scripts/fetch-google-reviews.mjs into
// src/config/tenants/{id}/google-reviews.json. The stub scaffold has
// fetchedAt: null and zero counts — the R-02 gate in seo.ts suppresses
// AggregateRating until a genuine fetch has occurred (fetchedAt set AND
// reviewCount >= 5). reviews is typed `readonly unknown[]` here to avoid
// importing the Review type from @/lib/reviews (which would create a
// circular dep: reviews.ts imports tenant config).
export type ReviewData = {
  fetchedAt: string | null;
  aggregate: { ratingValue: number; reviewCount: number };
  reviews: readonly unknown[];
};

export type TenantConfig = {
  id: string;
  site: TenantSite;
  location: Location;
  services: readonly Service[];
  reviewData: ReviewData;
};
