// ongles-rivieres physical location — Centre Les Rivières, Trois-Rivières.
import type { Location } from "@/config/types";

export const location: Location = {
  id: "centre-les-rivieres",
  name: "Centre Les Rivières",
  slug: "centre-les-rivieres",
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
  phone: "(819) 378-8228",
  phoneHref: "tel:+18193788228",
  hours: [
    { label: "Lun – Mer", value: "9 h 30 – 17 h 30" },
    { label: "Jeu – Ven", value: "9 h 00 – 21 h 00" },
    { label: "Sam", value: "9 h 00 – 17 h 00" },
    { label: "Dim", value: "10 h 00 – 17 h 00" },
  ],
  hoursSpec: [
    { days: ["Mo", "Tu", "We"], opens: "09:30", closes: "17:30" },
    { days: ["Th", "Fr"], opens: "09:00", closes: "21:00" },
    { days: ["Sa"], opens: "09:00", closes: "17:00" },
    { days: ["Su"], opens: "10:00", closes: "17:00" },
  ],
  // Geo coords confirmed by owner 2026-06-17 (Centre Les Rivières, Trois-Rivières).
  geo: { lat: 46.359, lng: -72.573 },
  bookerSlug: "",
};
