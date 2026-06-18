// template tenant — neutral placeholder, the clone source for new salon sites.
// Replace all values below with your salon's real information.

export const site = {
  name: "Your Salon",
  // Canonical production origin — feeds metadataBase, sitemap, robots and JSON-LD @id.
  // No trailing slash; relative metadata paths compose against this.
  url: "https://example.com",
  // Stable origin for schema.org @id URIs. NOT in SiteSectionSchema → cannot be
  // overridden by Supabase admin config (I-01). No trailing slash. Replace with
  // the real production domain before deploying.
  canonicalUrl: "https://example.com",
  // SalonX widget store code.
  storeId: "XX",
  // SalonX widget origin (no trailing slash). Admin can override per deploy.
  widgetHost: "https://app.onglesmaily.com",
  // All primary "Book now" CTAs route to the in-app booking page, which links
  // out to the online reservation system. Locale-agnostic base path (callers prefix /{locale}).
  booking: "/book-online",
  // Booking platform — brand hub + gift-certificate flow.
  booker: {
    brand: "https://example.com/reservation/",
    giftCertificate: "https://example.com/gift/",
  },
  // Profiles emitted as schema.org `sameAs` on the business node.
  socialProfiles: [],
  // Schema.org priceRange hint ($ = inexpensive … $$$$ = very pricey).
  priceRange: "$$",
  // Aggregate review rating shown on-page AND emitted as schema.org
  // AggregateRating (gated on a real Google fetch — see src/lib/seo.ts).
  reviews: {
    ratingValue: 0,
    reviewCount: 0,
    bestRating: 5,
    source: "Google",
  },
  // Approx coordinates of the primary location.
  geo: { lat: 0, lng: 0 },
  // Opening hours of the PRIMARY location. Days use schema.org
  // two-letter codes; times are 24h "HH:MM" for OpeningHoursSpecification.
  hours: [
    { days: ["Mo", "Tu", "We", "Th", "Fr"], opens: "09:00", closes: "18:00" },
    { days: ["Sa"], opens: "10:00", closes: "17:00" },
    { days: ["Su"], opens: "00:00", closes: "00:00" },
  ],
  contact: {
    email: "hello@example.com",
    phone: "(000) 000-0000",
    phoneHref: "tel:+10000000000",
    landmark: "",
    address: {
      line1: "123 Example Street",
      line2: "City, Region A1A 1A1",
      street: "123 Example Street",
      city: "City",
      region: "QC",
      postalCode: "A1A 1A1",
      country: "CA",
    },
  },
  // Header nav = ANCHOR links into the homepage (single-page design).
  // hrefs are prefixed with /{locale} by callers. Labels: dict.nav[key].
  nav: [
    { key: "services", href: "#services" },
    { key: "gallery", href: "#gallery" },
    { key: "reviews", href: "#testimonials" },
    { key: "locations", href: "#location" },
    { key: "giftcards", href: "#giftcards" },
  ],
  // Real indexable page routes (feeds the sitemap; nav is anchors now).
  routes: [
    "/services",
    "/gallery",
    "/locations",
    "/about",
    "/reviews",
    "/faq",
    "/contact",
    "/book-online",
    "/privacy",
    "/terms",
  ],
} as const;
