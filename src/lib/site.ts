// Locale-invariant business facts for Pure Nail Bar (Vancouver / Surrey, BC).
// Anything translatable (taglines, services, copy, nav labels) lives in
// src/dictionaries/en.json. Per-location data (5 salons) lives in
// src/lib/locations.ts; the fields here describe the BRAND and the PRIMARY
// location (Killarney), which backs the sitewide JSON-LD and footer.

import googleReviews from "@/data/google-reviews.json";

export const site = {
  name: "Pure Nail Bar",
  // Canonical production origin — feeds metadataBase, sitemap, robots and JSON-LD @id.
  // No trailing slash; relative metadata paths compose against this.
  url: "https://purenailbar.com",
  // All primary "Book now" CTAs route to the in-app booking page, which links
  // out to the brand's Booker hub. Locale-agnostic base path (callers prefix /{locale}).
  booking: "/book-online",
  // Brand social profiles.
  instagram: "https://www.instagram.com/purenailbar",
  facebook: "https://www.facebook.com/purenailbar",
  tiktok: "https://www.tiktok.com/@purenailbar",
  // Booker booking platform — brand hub + gift-certificate flow.
  booker: {
    brand: "https://go.booker.com/brand/purenailbar/locations",
    giftCertificate:
      "https://go.booker.com/location/purenailchamplain/buy/gift-certificate",
  },
  // Profiles emitted as schema.org `sameAs` on the business node.
  socialProfiles: [
    "https://www.instagram.com/purenailbar",
    "https://www.facebook.com/purenailbar",
    "https://www.tiktok.com/@purenailbar",
  ],
  // Schema.org priceRange hint ($ = inexpensive … $$$$ = very pricey).
  priceRange: "$$",
  // Aggregate review rating shown on-page AND emitted as schema.org
  // AggregateRating (gated on a real Google fetch — see src/lib/seo.ts).
  reviews: {
    ratingValue: googleReviews.aggregate.ratingValue,
    reviewCount: googleReviews.aggregate.reviewCount,
    bestRating: 5,
    source: "Google",
  },
  // Approx coordinates of the primary (Killarney) location, 7050 Kerr St.
  geo: { lat: 49.2192, lng: -123.0388 },
  // Opening hours of the PRIMARY location (Killarney). Days use schema.org
  // two-letter codes; times are 24h "HH:MM" for OpeningHoursSpecification.
  hours: [
    {
      days: ["Mo", "Tu", "We", "Th", "Fr", "Sa"],
      opens: "10:00",
      closes: "19:00",
    },
    { days: ["Su"], opens: "11:00", closes: "18:00" },
  ],
  contact: {
    email: "hello@purenailbar.com",
    phone: "(778) 379-9799",
    phoneHref: "tel:+17783799799",
    landmark: "Killarney — The Peak, Rupert & Kingsway",
    address: {
      line1: "7050 Kerr Street",
      line2: "Vancouver, BC V5S 4W2",
      street: "7050 Kerr Street",
      city: "Vancouver",
      region: "BC",
      postalCode: "V5S 4W2",
      country: "CA",
    },
  },
  // nav hrefs are locale-agnostic base paths; labels come from dict.nav[key].
  // Pages prefix hrefs with the active /{locale}.
  nav: [
    { key: "home", href: "/" },
    { key: "services", href: "/services" },
    { key: "gallery", href: "/gallery" },
    { key: "reviews", href: "/reviews" },
    { key: "locations", href: "/locations" },
    { key: "about", href: "/about" },
  ],
  // Secondary pages — footer + sitemap only, kept out of the primary header nav.
  secondaryNav: [
    { key: "giftcards", href: "/#giftcards" },
    { key: "careers", href: "/careers" },
    { key: "press", href: "/press" },
    { key: "pureParties", href: "/pure-parties" },
    { key: "franchising", href: "/franchising" },
    { key: "contact", href: "/contact" },
    { key: "faq", href: "/faq" },
    { key: "privacy", href: "/privacy" },
    { key: "terms", href: "/terms" },
  ],
} as const;
