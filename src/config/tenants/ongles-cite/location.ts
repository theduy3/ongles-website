// ongles-cite physical location — Place de la Cité, Sainte-Foy, Québec.
import type { Location } from "@/config/types";

export const location: Location = {
  id: "place-de-la-cite",
  name: "Place de la Cité",
  slug: "place-de-la-cite",
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
  phone: "(418) 653-8881",
  phoneHref: "tel:+14186538881",
  hours: [
    { label: "Lun – Ven", value: "10 h 00 – 18 h 00" },
    { label: "Sam", value: "9 h 00 – 17 h 00" },
    { label: "Dim", value: "10 h 00 – 17 h 00" },
  ],
  hoursSpec: [
    { days: ["Mo", "Tu", "We", "Th", "Fr"], opens: "10:00", closes: "18:00" },
    { days: ["Sa"], opens: "09:00", closes: "17:00" },
    { days: ["Su"], opens: "10:00", closes: "17:00" },
  ],
  // Geo = Place de la Cité mall anchor (salon is inside the mall).
  geo: { lat: 46.7734, lng: -71.2995 },
  bookerSlug: "",
};
