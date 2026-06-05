// ongles-charlesbourg physical location — Carrefour Charlesbourg. hours[] uses the
// French display labels (matching the ongles-maily convention); hoursSpec is the
// schema.org 24h form.
import type { Location } from "@/config/types";

export const location: Location = {
  id: "carrefour-charlesbourg",
  name: "Carrefour Charlesbourg",
  slug: "carrefour-charlesbourg",
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
  phone: "(581) 981-8228",
  phoneHref: "tel:+15819818228",
  hours: [
    { label: "Lun – Mer", value: "9 h 00 – 17 h 30" },
    { label: "Jeu – Ven", value: "9 h 00 – 20 h 00" },
    { label: "Sam", value: "9 h 00 – 17 h 00" },
    { label: "Dim", value: "10 h 00 – 17 h 00" },
  ],
  hoursSpec: [
    { days: ["Mo", "Tu", "We"], opens: "09:00", closes: "17:30" },
    { days: ["Th", "Fr"], opens: "09:00", closes: "20:00" },
    { days: ["Sa"], opens: "09:00", closes: "17:00" },
    { days: ["Su"], opens: "10:00", closes: "17:00" },
  ],
  // TODO: confirm exact coordinates (approx Carrefour Charlesbourg).
  geo: { lat: 46.8629, lng: -71.279 },
  bookerSlug: "",
};
