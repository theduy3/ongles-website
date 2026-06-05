// ongles-rivieres tenant — brand + primary-location facts for Ongles Rivières
// (Centre Les Rivières, Trois-Rivières). Seeded from src/lib/salons.ts. nav/routes
// kept identical + `as const` (see Charlesbourg note re: dict.nav[key]).

export const site = {
  name: "Ongles Rivières",
  url: "https://www.onglesrivieres.com",
  // TODO: confirm SalonX widget store code for Rivières.
  storeId: "OR",
  booking: "/book-online",
  booker: {
    brand: "https://www.onglesrivieres.com/reservation/",
    // TODO: confirm real gift-certificate URL for Rivières.
    giftCertificate: "https://www.onglesrivieres.com/reservation/",
  },
  // TODO: confirm Google Business Profile (Maps CID) for Rivières.
  socialProfiles: [],
  priceRange: "$$",
  reviews: {
    ratingValue: 0,
    reviewCount: 0,
    bestRating: 5,
    source: "Google",
  },
  // TODO: confirm exact coordinates (approx Centre Les Rivières, Trois-Rivières).
  geo: { lat: 46.359, lng: -72.573 },
  hours: [
    { days: ["Mo", "Tu", "We"], opens: "09:30", closes: "17:30" },
    { days: ["Th", "Fr"], opens: "09:00", closes: "21:00" },
    { days: ["Sa"], opens: "09:00", closes: "17:00" },
    { days: ["Su"], opens: "10:00", closes: "17:00" },
  ],
  contact: {
    // TODO: confirm public contact email for Rivières.
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
