// ongles-charlesbourg tenant config.
import { site } from "./site";
import { location } from "./location";
import { services } from "./services";

export const onglesCharlesbourg = {
  id: "ongles-charlesbourg",
  site,
  location,
  services,
} as const;
