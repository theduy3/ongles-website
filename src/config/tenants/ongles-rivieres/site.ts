// ongles-rivieres tenant — brand + primary-location facts for Ongles Rivières
// (Centre Les Rivières, Trois-Rivières). Seeded from src/lib/salons.ts. nav/routes
// kept identical + `as const` (see Charlesbourg note re: dict.nav[key]).

export const site = {
  name: "Ongles Rivières",
  url: "https://www.onglesrivieres.com",
  // Stable origin for schema.org @id URIs. NOT in SiteSectionSchema → cannot be
  // overridden by Supabase admin config (I-01). No trailing slash.
  canonicalUrl: "https://www.onglesrivieres.com",
  // Real SalonX widget store code — confirmed by owner 2026-06-17.
  storeId: "OR",
  // SalonX widget origin (no trailing slash). Admin can override per deploy.
  widgetHost: "https://app.onglesmaily.com",
  booking: "/book-online",
  booker: {
    brand: "https://www.onglesrivieres.com/reservation/",
    // No Square gift-certificate link yet — deferred-OK per D-08. Using booking URL as
    // safe fallback until a dedicated gift-cert URL is available.
    giftCertificate: "https://www.onglesrivieres.com/reservation/",
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
  // Geo coords confirmed by owner 2026-06-17 (Centre Les Rivières, Trois-Rivières).
  geo: { lat: 46.359, lng: -72.573 },
  hours: [
    { days: ["Mo", "Tu", "We"], opens: "09:30", closes: "17:30" },
    { days: ["Th", "Fr"], opens: "09:00", closes: "21:00" },
    { days: ["Sa"], opens: "09:00", closes: "17:00" },
    { days: ["Su"], opens: "10:00", closes: "17:00" },
  ],
  contact: {
    // Real public contact email — confirmed by owner 2026-06-17.
    email: "info@onglesrivieres.com",
    phone: "(819) 378-8228",
    phoneHref: "tel:+18193788228",
    landmark: "Centre Les Rivières",
    address: {
      line1: "4225 boulevard des Forges",
      line2: "Trois-Rivières, QC G8Y 1W2",
      street: "4225 boulevard des Forges",
      city: "Trois-Rivières",
      region: "QC",
      postalCode: "G8Y 1W2",
      country: "CA",
    },
  },
  // GA4 measurement ID for this salon's property. Empty = no analytics yet.
  // Real "G-XXXXXXXXXX" collected in phase 05-05 human-verify step.
  ga4MeasurementId: "",
  // Hand-authored AI-discovery intro (≥200 unique words) for llms.txt.
  // Authored in phase 05-05 (owner-reviewed). No other tenant's city/landmark.
  llmsDescription:
    "Ongles Rivières est un salon de soins des ongles situé au Centre Les Rivières, au 4225 boulevard des Forges à Trois-Rivières (G8Y 1W2). L'équipe accueille la clientèle de Trois-Rivières et de la région de la Mauricie pour une gamme complète de services : pose d'ongles (à partir de 60 $), remplissage (à partir de 45 $), soins des mains et manucure (à partir de 30 $) ainsi que soins des pieds et pédicure (à partir de 35 $). Chaque prestation est réalisée avec soin par des technicien·ne·s attentif·ve·s à l'hygiène, à la précision et à la longévité du vernis gel, dans un cadre confortable et convivial. Le salon est ouvert du lundi au mercredi de 9 h 30 à 17 h 30, le jeudi et le vendredi de 9 h à 21 h, le samedi de 9 h à 17 h et le dimanche de 10 h à 17 h. Les rendez-vous se prennent en ligne sur la page « Prendre rendez-vous » du site onglesrivieres.com ou par téléphone au (819) 378-8228. Grâce à son emplacement dans un centre commercial avec stationnement gratuit, Ongles Rivières est facilement accessible pour une manucure, une pédicure, une pose ou un remplissage, en semaine comme la fin de semaine, à Trois-Rivières.",
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
    "/trois-rivieres",
  ],
} as const;
