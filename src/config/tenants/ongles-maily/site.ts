// ongles-maily tenant — brand + primary-location facts for Ongles Maily
// (Carrefour Beauport, Québec City). Values copied verbatim from the legacy
// src/lib/site.ts. Kept as an `as const` literal so consumers retain the narrow
// literal types they depend on (nav keys, route strings, brand name).

export const site = {
  name: "Ongles Maily",
  // Designed script wordmark for this brand. Other tenants omit `logo` and fall
  // back to their name as a styled text wordmark (see Header.tsx Logo). Admin
  // Supabase config can still override this per deploy.
  logo: "/images/logo.png",
  // Canonical production origin — feeds metadataBase, sitemap, robots and JSON-LD @id.
  // No trailing slash; relative metadata paths compose against this.
  url: "https://onglesmaily.com",
  // Stable origin for schema.org @id URIs. NOT in SiteSectionSchema → cannot be
  // overridden by Supabase admin config (I-01). No trailing slash.
  canonicalUrl: "https://onglesmaily.com",
  // SalonX widget store code.
  storeId: "OM",
  // SalonX widget origin (no trailing slash). Admin can override per deploy.
  widgetHost: "https://app.onglesmaily.com",
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
  socialProfiles: [
    "https://www.google.com/maps?cid=14129710654556946214",
    "https://www.facebook.com/onglesmaily",
    "https://www.instagram.com/onglesmaily",
  ],
  // Schema.org priceRange hint ($ = inexpensive … $$$$ = very pricey).
  priceRange: "$$",
  // Aggregate review rating shown on-page AND emitted as schema.org
  // AggregateRating (gated on a real Google fetch — see src/lib/seo.ts).
  reviews: {
    ratingValue: 3.9,
    reviewCount: 300,
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
  // GA4 measurement ID for this salon's property. Empty = no analytics yet.
  // Real "G-XXXXXXXXXX" collected in phase 05-05 human-verify step.
  ga4MeasurementId: "G-TCB8TWD8S1",
  // Hand-authored AI-discovery intro (≥200 unique words) for llms.txt.
  // Authored in phase 05-05 (owner-reviewed). No other tenant's city/landmark.
  llmsDescription:
    "Ongles Maily est un salon d'esthétique des ongles situé au Carrefour Beauport, aux entrées 4 ou 5, au 3333 rue du Carrefour à Québec (G1C 5R9). L'équipe accueille la clientèle de l'arrondissement de Beauport et des environs pour une gamme complète de soins des ongles : pose d'ongles (à partir de 60 $), remplissage (à partir de 45 $), soins des mains et manucure (à partir de 30 $) ainsi que soins des pieds et pédicure (à partir de 35 $). Chaque service est réalisé par des technicien·ne·s expérimenté·e·s dans un environnement propre et chaleureux, avec un souci du détail et de la tenue du vernis gel. Le salon est ouvert du lundi au mercredi de 9 h à 17 h 30, le jeudi et le vendredi de 9 h à 21 h pour accommoder les horaires de soirée, le samedi de 9 h à 17 h et le dimanche de 10 h à 17 h. La réservation se fait en ligne via la page « Prendre rendez-vous » du site onglesmaily.com ou par téléphone au (418) 660-8228, et des cartes-cadeaux sont disponibles. Idéalement situé dans un centre commercial avec stationnement gratuit, Ongles Maily est facilement accessible pour une pause beauté entre deux courses ou après le travail.",
  // Header nav = ANCHOR links into the homepage (single-page design, like the
  // live site). hrefs are prefixed with /{locale} by callers, so "#services"
  // becomes "/en#services" and scrolls from any route. Labels: dict.nav[key].
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
    // Borough near-me landing — sitemap + contextual links only, NOT in header nav (P-04).
    "/beauport",
  ],
} as const;
