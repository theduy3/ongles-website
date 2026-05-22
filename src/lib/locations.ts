// Multi-location registry — Pure Nail Bar operates 5 salons across Greater
// Vancouver. Structural, locale-invariant data (the parent SS-website was
// single-location; this is the main net-new concept of the clone). Display copy
// (section headings, labels) lives in dict.locations.

export type DayHours = { label: string; value: string };

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

export const locations: readonly Location[] = [
  {
    id: "killarney",
    name: "Killarney",
    slug: "killarney",
    landmark: "Located in The Peak — Rupert & Kingsway",
    address: {
      line1: "7050 Kerr Street",
      line2: "Vancouver, BC V5S 4W2",
      street: "7050 Kerr Street",
      city: "Vancouver",
      region: "BC",
      postalCode: "V5S 4W2",
      country: "CA",
    },
    phone: "(778) 379-9799",
    phoneHref: "tel:+17783799799",
    hours: [
      { label: "Mon – Sat", value: "10:00 AM – 7:00 PM" },
      { label: "Sunday", value: "11:00 AM – 6:00 PM" },
    ],
    hoursSpec: [
      {
        days: ["Mo", "Tu", "We", "Th", "Fr", "Sa"],
        opens: "10:00",
        closes: "19:00",
      },
      { days: ["Su"], opens: "11:00", closes: "18:00" },
    ],
    geo: { lat: 49.2192, lng: -123.0388 },
    bookerSlug: "purenailchamplain",
  },
  {
    id: "kitsilano-west-4th",
    name: "Kitsilano West 4th",
    slug: "kitsilano-west-4th",
    address: {
      line1: "2139 West 4th Avenue",
      line2: "Vancouver, BC V6K 1N7",
      street: "2139 West 4th Avenue",
      city: "Vancouver",
      region: "BC",
      postalCode: "V6K 1N7",
      country: "CA",
    },
    phone: "(604) 738-8990",
    phoneHref: "tel:+16047388990",
    hours: [{ label: "Daily", value: "10:00 AM – 7:00 PM" }],
    hoursSpec: [
      {
        days: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
        opens: "10:00",
        closes: "19:00",
      },
    ],
    geo: { lat: 49.2683, lng: -123.1545 },
    bookerSlug: "purenailwest4",
  },
  {
    id: "morgan-crossing",
    name: "Morgan Crossing",
    slug: "morgan-crossing",
    address: {
      line1: "120-15735 Croydon Drive",
      line2: "Surrey, BC V3Z 2L5",
      street: "120-15735 Croydon Drive",
      city: "Surrey",
      region: "BC",
      postalCode: "V3Z 2L5",
      country: "CA",
    },
    phone: "(778) 294-4500",
    phoneHref: "tel:+17782944500",
    hours: [
      { label: "Mon – Sat", value: "10:00 AM – 7:00 PM" },
      { label: "Sunday", value: "10:00 AM – 6:00 PM" },
    ],
    hoursSpec: [
      {
        days: ["Mo", "Tu", "We", "Th", "Fr", "Sa"],
        opens: "10:00",
        closes: "19:00",
      },
      { days: ["Su"], opens: "10:00", closes: "18:00" },
    ],
    geo: { lat: 49.0469, lng: -122.7969 },
    bookerSlug: "purenailcroydon",
  },
  {
    id: "olympic-village",
    name: "Olympic Village",
    slug: "olympic-village",
    address: {
      line1: "1780 Manitoba Street",
      line2: "Vancouver, BC V5Y 0H1",
      street: "1780 Manitoba Street",
      city: "Vancouver",
      region: "BC",
      postalCode: "V5Y 0H1",
      country: "CA",
    },
    phone: "(604) 559-7488",
    phoneHref: "tel:+16045597488",
    hours: [{ label: "Daily", value: "10:00 AM – 7:00 PM" }],
    hoursSpec: [
      {
        days: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
        opens: "10:00",
        closes: "19:00",
      },
    ],
    geo: { lat: 49.2686, lng: -123.1027 },
    bookerSlug: "pure10",
  },
  {
    id: "renfrew-heights",
    name: "Renfrew Heights",
    slug: "renfrew-heights",
    address: {
      line1: "3739 Rupert Street",
      line2: "Vancouver, BC V5M 3W2",
      street: "3739 Rupert Street",
      city: "Vancouver",
      region: "BC",
      postalCode: "V5M 3W2",
      country: "CA",
    },
    phone: "(604) 564-9799",
    phoneHref: "tel:+16045649799",
    hours: [
      { label: "Mon – Sat", value: "10:00 AM – 7:00 PM" },
      { label: "Sunday", value: "11:00 AM – 6:00 PM" },
    ],
    hoursSpec: [
      {
        days: ["Mo", "Tu", "We", "Th", "Fr", "Sa"],
        opens: "10:00",
        closes: "19:00",
      },
      { days: ["Su"], opens: "11:00", closes: "18:00" },
    ],
    geo: { lat: 49.2486, lng: -123.0356 },
    bookerSlug: "PureNailBarRenfew",
  },
];

/** Per-location Booker service-menu URL — the location's "Book Now" target. */
export function bookerServiceMenu(loc: Location): string {
  return `https://go.booker.com/location/${loc.bookerSlug}/service-menu`;
}

/** Google Maps embed src (no API key needed) for a location's full address. */
export function mapEmbedUrl(loc: Location): string {
  const q = encodeURIComponent(`${loc.address.street}, ${loc.address.line2}`);
  return `https://www.google.com/maps?q=${q}&output=embed`;
}

/** Google Maps "open in Maps" link for the location pin. */
export function mapLink(loc: Location): string {
  const q = encodeURIComponent(
    `Pure Nail Bar ${loc.name}, ${loc.address.street}, ${loc.address.line2}`,
  );
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/** Resolve a location by slug, or undefined (→ 404). */
export function locationBySlug(slug: string): Location | undefined {
  return locations.find((l) => l.slug === slug);
}
