// ongles-cite tenant — brand + primary-location facts for Ongles et Spa Québec
// (Place de la Cité, Sainte-Foy, Québec). nav/routes kept identical + `as const`
// (see Charlesbourg note re: dict.nav[key]).

export const site = {
  name: "Ongles et Spa Québec",
  url: "https://www.onglesspaquebec.com",
  // Stable origin for schema.org @id URIs. NOT in SiteSectionSchema → cannot be
  // overridden by Supabase admin config (I-01). No trailing slash.
  canonicalUrl: "https://www.onglesspaquebec.com",
  // SalonX widget store code — operator-supplied for the 2026-10-01 launch.
  storeId: "OQ",
  // SalonX widget origin (no trailing slash). Admin can override per deploy.
  widgetHost: "https://app.onglesmaily.com",
  booking: "/book-online",
  booker: {
    brand: "https://www.onglesspaquebec.com/reservation/",
    // No dedicated gift-certificate link yet — deferred-OK per D-08. Using the
    // booking URL as safe fallback until a dedicated gift-cert URL is available.
    giftCertificate: "https://www.onglesspaquebec.com/reservation/",
  },
  // No Google Business Profile yet — deferred per D-07. Facebook page is live
  // (facebook.com/Onglesetspaqc) and is a valid non-Maps sameAs entry.
  socialProfiles: ["https://www.facebook.com/Onglesetspaqc/"],
  priceRange: "$$",
  reviews: {
    ratingValue: 0,
    reviewCount: 0,
    bestRating: 5,
    source: "Google",
  },
  // Geo = Place de la Cité mall anchor (salon is inside the mall).
  geo: { lat: 46.7734, lng: -71.2995 },
  // Hours confirmed on the salon's Fresha listing (operator-approved).
  hours: [
    { days: ["Mo", "Tu", "We", "Th", "Fr"], opens: "10:00", closes: "18:00" },
    { days: ["Sa"], opens: "09:00", closes: "17:00" },
    { days: ["Su"], opens: "10:00", closes: "17:00" },
  ],
  contact: {
    email: "info@onglesspaquebec.com",
    phone: "(418) 653-8881",
    phoneHref: "tel:+14186538881",
    landmark: "Place de la Cité",
    address: {
      line1: "2600 boulevard Laurier",
      line2: "Québec, QC G1V 4T3",
      street: "2600 boulevard Laurier",
      city: "Québec",
      region: "QC",
      postalCode: "G1V 4T3",
      country: "CA",
    },
  },
  // GA4 measurement ID for this salon's property. Empty = no analytics yet.
  ga4MeasurementId: "",
  // Hand-authored AI-discovery intro (≥200 unique words) for llms.txt.
  // Sainte-Foy / boulevard Laurier / Place de la Cité only — no other tenant's
  // city or landmark (checkLlmsLeak build guard).
  llmsDescription:
    "Ongles et Spa Québec est un salon de soins des ongles situé à Place de la Cité, au 2600 boulevard Laurier, dans l'arrondissement Sainte-Foy à Québec (G1V 4T3). L'équipe accueille la clientèle de Sainte-Foy, de Sillery, de Cap-Rouge et de toute la région de Québec pour une gamme complète de services : pose d'ongles (à partir de 60 $), remplissage (à partir de 45 $), soins des mains et manucure (à partir de 30 $) ainsi que soins des pieds et pédicure (à partir de 35 $). Chaque prestation est réalisée avec soin par des technicien·ne·s attentif·ve·s à l'hygiène, à la précision et à la longévité du vernis gel, dans un cadre confortable et convivial. Le salon est ouvert du lundi au vendredi de 10 h à 18 h, le samedi de 9 h à 17 h et le dimanche de 10 h à 17 h. Les rendez-vous se prennent en ligne sur la page « Prendre rendez-vous » du site onglesspaquebec.com ou par téléphone au (418) 653-8881. Grâce à son emplacement dans un centre commercial avec stationnement gratuit, Ongles et Spa Québec est facilement accessible pour une manucure, une pédicure, une pose ou un remplissage, en semaine comme la fin de semaine, à Sainte-Foy.",
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
    "/sainte-foy",
  ],
} as const;
