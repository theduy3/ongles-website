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
  priceTo: number; // upper bound for AggregateOffer range
  photo: boolean; // true once public/images/services/<id>.webp exists
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
// primary maily-beauport tenant keeps an `as const` literal to preserve the narrow
// literal types its consumers rely on (nav keys, route strings, brand name).
export type TenantSite = {
  name: string;
  url: string;
  // SalonX widget store code (booking / check-in / queue widgets).
  storeId: string;
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
  nav: readonly { key: string; href: string }[];
  routes: readonly string[];
};

export type TenantConfig = {
  id: string;
  site: TenantSite;
  location: Location;
  services: readonly Service[];
};
