// ongles-rivieres tenant config.
import { site } from "./site";
import { location } from "./location";
import { services } from "./services";
import reviewData from "./google-reviews.json";

export const onglesRivieres = {
  id: "ongles-rivieres",
  site,
  location,
  services,
  reviewData,
} as const;
