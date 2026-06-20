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
  // GA4 measurement ID for this salon's property. Empty = no analytics yet.
  // Real "G-XXXXXXXXXX" collected in phase 05-05 human-verify step.
  ga4MeasurementId: "",
  // Hand-authored AI-discovery intro (≥200 unique words) for llms.txt.
  // Authored in phase 05-05 (owner-reviewed). No other tenant's city/landmark.
  llmsDescription:
    "Ongles Charlesbourg est un salon spécialisé en soins des ongles situé au Carrefour Charlesbourg, à l'entrée 5, au 8500 boulevard Henri-Bourassa à Québec (G1G 5X1). Le salon dessert la clientèle de l'arrondissement de Charlesbourg et des quartiers avoisinants avec une offre complète : pose d'ongles (à partir de 60 $), remplissage (à partir de 45 $), soins des mains et manucure (à partir de 30 $) et soins des pieds et pédicure (à partir de 35 $). Les technicien·ne·s mettent l'accent sur l'hygiène, la précision et la tenue du vernis gel, dans une ambiance accueillante et détendue. Les heures d'ouverture sont du lundi au mercredi de 9 h à 17 h 30, le jeudi et le vendredi de 9 h à 20 h, le samedi de 9 h à 17 h et le dimanche de 10 h à 17 h. On peut réserver en ligne à partir de la page « Prendre rendez-vous » du site onglescharlesbourg.com ou par téléphone au (581) 981-8228. Le salon est installé dans un centre commercial offrant un stationnement gratuit et un accès facile, ce qui en fait une destination pratique pour une manucure, une pédicure, une pose ou un remplissage, que ce soit pour un rendez-vous régulier ou une occasion spéciale dans le secteur de Charlesbourg.",
  nav: [
    { key: "services", href: "#services" },
    { key: "gallery", href: "#gallery" },
    { key: "reviews", href: "#testimonials" },
    { key: "locations", href: "#location" },
    { key: "giftcards", href: "#giftcards" },
    // Real-route nav entries (locale-distinct slugs — hrefByLocale overrides href per locale).
    { key: "pricing", href: "/tarifs", hrefByLocale: { fr: "/tarifs", en: "/pricing" } },
    {
      key: "comparisons",
      href: "/comparaisons/pose-vs-remplissage",
      hrefByLocale: {
        fr: "/comparaisons/pose-vs-remplissage",
        en: "/comparisons/nail-extensions-vs-fill",
      },
    },
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
    // Borough near-me landing — sitemap + contextual links only, NOT in header nav (P-04).
    "/charlesbourg",
  ],
} as const;
