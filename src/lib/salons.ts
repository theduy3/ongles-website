// Sister salons — independent brands owned by the same family, shown on the
// Maily site for cross-promotion. DISPLAY ONLY: deliberately kept OUT of
// `locations` (src/lib/locations.ts) so they never become `department` nodes of
// Ongles Maily's LocalBusiness JSON-LD and never inherit Maily's booker. Each is
// a separate business with its own domain, NAP and reservation system.

import type { DayHours } from "./locations";

export type SisterSalon = {
  id: string;
  brand: string; // proper-noun brand name (locale-invariant)
  landmark?: string;
  website?: string;
  // `query` is the Google Maps search string for the embed + open-in-maps link.
  address?: { line1: string; line2: string; query: string };
  phone?: string;
  phoneHref?: string;
  booking?: string;
  // Pre-formatted per-locale hours (the salons keep different schedules).
  hours?: { fr: DayHours[]; en: DayHours[] };
  comingSoon?: boolean;
  // Optional per-locale display name for descriptive/placeholder entries that
  // aren't locale-invariant proper nouns. Falls back to `brand` when absent.
  brandByLocale?: { fr: string; en: string };
};

export const sisterSalons: readonly SisterSalon[] = [
  {
    id: "maily",
    brand: "Ongles Maily",
    landmark: "Carrefour Beauport — Entrées 4 ou 5",
    website: "https://onglesmaily.com",
    address: {
      line1: "3333 Rue du Carrefour",
      line2: "Québec, QC G1C 5R9",
      query: "Ongles Maily, 3333 Rue du Carrefour, Québec, QC G1C 5R9",
    },
    phone: "(418) 660-8228",
    phoneHref: "tel:+14186608228",
    booking: "https://onglesmaily.com/book-online",
    hours: {
      fr: [
        { label: "Lun – Mer", value: "9 h 00 – 17 h 30" },
        { label: "Jeu – Ven", value: "9 h 00 – 21 h 00" },
        { label: "Sam", value: "9 h 00 – 17 h 00" },
        { label: "Dim", value: "10 h 00 – 17 h 00" },
      ],
      en: [
        { label: "Mon – Wed", value: "9:00 AM – 5:30 PM" },
        { label: "Thu – Fri", value: "9:00 AM – 9:00 PM" },
        { label: "Sat", value: "9:00 AM – 5:00 PM" },
        { label: "Sun", value: "10:00 AM – 5:00 PM" },
      ],
    },
  },
  {
    id: "charlesbourg",
    brand: "Ongles Charlesbourg",
    landmark: "Carrefour Charlesbourg — Entrées 5",
    website: "https://www.onglescharlesbourg.com",
    address: {
      line1: "8500 boulevard Henri-Bourassa",
      line2: "Québec, QC G1G 5X1",
      query:
        "Ongles Charlesbourg, 8500 boulevard Henri-Bourassa, Québec, QC G1G 5X1",
    },
    phone: "(581) 981-8228",
    phoneHref: "tel:+15819818228",
    booking: "https://www.onglescharlesbourg.com/reservation/",
    // Same schedule as Ongles Maily, except Thu–Fri close at 8 PM (not 9 PM).
    hours: {
      fr: [
        { label: "Lun – Mer", value: "9 h 00 – 17 h 30" },
        { label: "Jeu – Ven", value: "9 h 00 – 20 h 00" },
        { label: "Sam", value: "9 h 00 – 17 h 00" },
        { label: "Dim", value: "10 h 00 – 17 h 00" },
      ],
      en: [
        { label: "Mon – Wed", value: "9:00 AM – 5:30 PM" },
        { label: "Thu – Fri", value: "9:00 AM – 8:00 PM" },
        { label: "Sat", value: "9:00 AM – 5:00 PM" },
        { label: "Sun", value: "10:00 AM – 5:00 PM" },
      ],
    },
  },
  {
    id: "rivieres",
    brand: "Ongles Rivières",
    landmark: "Centre Les Rivières",
    website: "https://www.onglesrivieres.com",
    address: {
      line1: "4225 boulevard des Forges",
      line2: "Trois-Rivières, QC G8Y 1W2",
      query:
        "Ongles Rivières, 4225 boulevard des Forges, Trois-Rivières, QC G8Y 1W2",
    },
    phone: "(819) 378-8228",
    phoneHref: "tel:+18193788228",
    booking: "https://www.onglesrivieres.com/reservation/",
    hours: {
      fr: [
        { label: "Lun – Mer", value: "9 h 30 – 17 h 30" },
        { label: "Jeu – Ven", value: "9 h 00 – 21 h 00" },
        { label: "Sam", value: "9 h 00 – 17 h 00" },
        { label: "Dim", value: "10 h 00 – 17 h 00" },
      ],
      en: [
        { label: "Mon – Wed", value: "9:30 AM – 5:30 PM" },
        { label: "Thu – Fri", value: "9:00 AM – 9:00 PM" },
        { label: "Sat", value: "9:00 AM – 5:00 PM" },
        { label: "Sun", value: "10:00 AM – 5:00 PM" },
      ],
    },
  },
];
