// Location registry — Ongles Maily operates one salon at Carrefour Beauport,
// Québec City. Display copy (section headings, labels) lives in dict.locations.

import { site } from "./site";

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
    id: "carrefour-beauport",
    name: "Carrefour Beauport",
    slug: "carrefour-beauport",
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
    phone: "(418) 660-8228",
    phoneHref: "tel:+14186608228",
    hours: [
      { label: "Lun – Mer", value: "9 h 00 – 17 h 30" },
      { label: "Jeu – Ven", value: "9 h 00 – 21 h 00" },
      { label: "Sam", value: "9 h 00 – 17 h 00" },
      { label: "Dim", value: "10 h 00 – 17 h 00" },
    ],
    hoursSpec: [
      { days: ["Mo", "Tu", "We"], opens: "09:00", closes: "17:30" },
      { days: ["Th", "Fr"], opens: "09:00", closes: "21:00" },
      { days: ["Sa"], opens: "09:00", closes: "17:00" },
      { days: ["Su"], opens: "10:00", closes: "17:00" },
    ],
    geo: { lat: 46.8606, lng: -71.1947 },
    bookerSlug: "",
  },
];

/** Per-location Booker service-menu URL — the location's "Book Now" target. */
export function bookerServiceMenu(_loc: Location): string {
  return site.booker.brand;
}

/** Google Maps embed src (no API key needed) for any address query string. */
export function mapEmbedSrc(query: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

/** Google Maps "open in Maps" search link for any query string. */
export function mapSearchLink(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Google Maps embed src for a Maily location's full address. */
export function mapEmbedUrl(loc: Location): string {
  return mapEmbedSrc(`${loc.address.street}, ${loc.address.line2}`);
}

/** Google Maps "open in Maps" link for the location pin. */
export function mapLink(loc: Location): string {
  return mapSearchLink(
    `${site.name} ${loc.name}, ${loc.address.street}, ${loc.address.line2}`,
  );
}

/** Resolve a location by slug, or undefined (→ 404). */
export function locationBySlug(slug: string): Location | undefined {
  return locations.find((l) => l.slug === slug);
}
