// template tenant — neutral placeholder, the clone source for new salon sites.
import { site } from "./site";
import { location } from "./location";
import { services } from "./services";
import reviewData from "./google-reviews.json";

export const template = {
  id: "template",
  site,
  location,
  services,
  reviewData,
} as const;
