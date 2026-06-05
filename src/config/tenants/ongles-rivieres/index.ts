// ongles-rivieres tenant config.
import { site } from "./site";
import { location } from "./location";
import { services } from "./services";

export const onglesRivieres = {
  id: "ongles-rivieres",
  site,
  location,
  services,
} as const;
