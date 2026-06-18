// ongles-charlesbourg tenant config.
import { site } from "./site";
import { location } from "./location";
import { services } from "./services";
import reviewData from "./google-reviews.json";

export const onglesCharlesbourg = {
  id: "ongles-charlesbourg",
  site,
  location,
  services,
  reviewData,
} as const;
