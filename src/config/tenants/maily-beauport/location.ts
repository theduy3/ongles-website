// maily-beauport physical location — Carrefour Beauport. Copied verbatim from the
// legacy src/lib/locations.ts single entry. Display copy lives in dict.locations.
import type { Location } from "@/config/types";

export const location: Location = {
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
};
