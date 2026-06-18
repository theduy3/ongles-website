// ongles-charlesbourg tenant — brand + primary-location facts for Ongles
// Charlesbourg (Carrefour Charlesbourg, Québec). Seeded from the legacy sister-salon
// entry in src/lib/salons.ts. nav/routes are kept identical to other tenants (and
// `as const`) so the resolved `site.nav[].key` union stays a literal — required by
// dict.nav[key] indexing in Header.tsx.

export const site = {
  name: "Ongles Charlesbourg",
  url: "https://www.onglescharlesbourg.com",
  // Stable origin for schema.org @id URIs. NOT in SiteSectionSchema → cannot be
  // overridden by Supabase admin config (I-01). No trailing slash.
  canonicalUrl: "https://www.onglescharlesbourg.com",
  // Real SalonX widget store code — confirmed by owner 2026-06-17.
  storeId: "OC",
  // SalonX widget origin (no trailing slash). Admin can override per deploy.
  widgetHost: "https://app.onglesmaily.com",
  booking: "/book-online",
  booker: {
    brand: "https://www.onglescharlesbourg.com/reservation/",
    // No Square gift-certificate link yet — deferred-OK per D-08. Using booking URL as
    // safe fallback until a dedicated gift-cert URL is available.
    giftCertificate: "https://www.onglescharlesbourg.com/reservation/",
  },
  // No Google Business Profile yet — deferred per D-07. Keep as empty array so the
  // schema.org sameAs field is omitted cleanly (no empty-string or placeholder CID).
  // Add the maps?cid=<digits> URL here once a GBP exists.
  socialProfiles: [],
  priceRange: "$$",
  reviews: {
    ratingValue: 0,
    reviewCount: 0,
    bestRating: 5,
    source: "Google",
  },
  // Geo coords confirmed by owner 2026-06-17 (Carrefour Charlesbourg).
  geo: { lat: 46.8629, lng: -71.279 },
  // Same schedule as Ongles Maily, except Thu–Fri close at 8 PM (not 9 PM).
  hours: [
    { days: ["Mo", "Tu", "We"], opens: "09:00", closes: "17:30" },
    { days: ["Th", "Fr"], opens: "09:00", closes: "20:00" },
    { days: ["Sa"], opens: "09:00", closes: "17:00" },
    { days: ["Su"], opens: "10:00", closes: "17:00" },
  ],
  contact: {
    // Real public contact email — confirmed by owner 2026-06-17.
    email: "info@onglescharlesbourg.com",
    phone: "(581) 981-8228",
    phoneHref: "tel:+15819818228",
    landmark: "Carrefour Charlesbourg — Entrées 5",
    address: {
      line1: "8500 boulevard Henri-Bourassa",
      line2: "Québec, QC G1G 5X1",
      street: "8500 boulevard Henri-Bourassa",
      city: "Québec",
      region: "QC",
      postalCode: "G1G 5X1",
      country: "CA",
    },
  },
  nav: [
    { key: "services", href: "#services" },
    { key: "gallery", href: "#gallery" },
    { key: "reviews", href: "#testimonials" },
    { key: "locations", href: "#location" },
    { key: "giftcards", href: "#giftcards" },
  ],
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
