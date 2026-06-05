// maily-beauport tenant — brand + primary-location facts for Ongles Maily
// (Carrefour Beauport, Québec City). Values copied verbatim from the legacy
// src/lib/site.ts. Kept as an `as const` literal so consumers retain the narrow
// literal types they depend on (nav keys, route strings, brand name).

export const site = {
  name: "Ongles Maily",
  // Canonical production origin — feeds metadataBase, sitemap, robots and JSON-LD @id.
  // No trailing slash; relative metadata paths compose against this.
  url: "https://onglesmaily.com",
  // All primary "Book now" CTAs route to the in-app booking page, which links
  // out to the online reservation system. Locale-agnostic base path (callers prefix /{locale}).
  booking: "/book-online",
  // Booking platform — brand hub + gift-certificate flow.
  booker: {
    brand: "https://moo.wyf.mybluehost.me/website_44873f44/reservation/",
    giftCertificate: "https://app.squareup.com/gift/GVCCQ8WQ9Z4MW/order",
  },
  // Profiles emitted as schema.org `sameAs` on the business node.
  // Google Business Profile (Maps CID). Add Facebook/Instagram URLs here too.
  socialProfiles: ["https://www.google.com/maps?cid=14129710654556946214"],
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
  // Approx coordinates of the primary location at Carrefour Beauport.
  geo: { lat: 46.8606, lng: -71.1947 },
  // Opening hours of the PRIMARY location. Days use schema.org
  // two-letter codes; times are 24h "HH:MM" for OpeningHoursSpecification.
  hours: [
    { days: ["Mo", "Tu", "We"], opens: "09:00", closes: "17:30" },
    { days: ["Th", "Fr"], opens: "09:00", closes: "21:00" },
    { days: ["Sa"], opens: "09:00", closes: "17:00" },
    { days: ["Su"], opens: "10:00", closes: "17:00" },
  ],
  contact: {
    email: "onglesmailyqc@gmail.com",
    phone: "(418) 660-8228",
    phoneHref: "tel:+14186608228",
    landmark: "Carrefour Beauport — Entrées 4 ou 5",
    address: {
      line1: "3333 Rue du Carrefour",
      line2: "Québec, QC G1C 5R9",
      street: "3333 Rue du Carrefour",
      city: "Québec",
      region: "QC",
      postalCode: "G1C 5R9",
      country: "CA",
    },
  },
  // Header nav = ANCHOR links into the homepage (single-page design, like the
  // live site). hrefs are prefixed with /{locale} by callers, so "#services"
  // becomes "/en#services" and scrolls from any route. Labels: dict.nav[key].
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
