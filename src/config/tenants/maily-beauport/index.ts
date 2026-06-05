// maily-beauport tenant config — the primary Ongles Maily site (default tenant).
import { site } from "./site";
import { location } from "./location";
import { services } from "./services";

export const mailyBeauport = {
  id: "maily-beauport",
  site,
  location,
  services,
} as const;
