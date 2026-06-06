// template tenant — neutral placeholder, the clone source for new salon sites.
import { site } from "./site";
import { location } from "./location";
import { services } from "./services";

export const template = {
  id: "template",
  site,
  location,
  services,
} as const;
