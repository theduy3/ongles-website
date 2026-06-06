// template tenant — neutral placeholder location. Replace with real salon details.
import type { Location } from "@/config/types";

export const location: Location = {
  id: "main-location",
  name: "Your Salon",
  slug: "main-location",
  landmark: "",
  address: {
    line1: "123 Example Street",
    line2: "City, Region A1A 1A1",
    street: "123 Example Street",
    city: "City",
    region: "QC",
    postalCode: "A1A 1A1",
    country: "CA",
  },
  phone: "(000) 000-0000",
  phoneHref: "tel:+10000000000",
  hours: [
    { label: "Mon – Fri", value: "9:00 – 18:00" },
    { label: "Sat", value: "10:00 – 17:00" },
    { label: "Sun", value: "Closed" },
  ],
  hoursSpec: [
    { days: ["Mo", "Tu", "We", "Th", "Fr"], opens: "09:00", closes: "18:00" },
    { days: ["Sa"], opens: "10:00", closes: "17:00" },
    { days: ["Su"], opens: "00:00", closes: "00:00" },
  ],
  geo: { lat: 0, lng: 0 },
  bookerSlug: "",
};
