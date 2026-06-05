// maily-beauport tenant config — the primary Ongles Maily site (default tenant).
import { site } from "./site";
import { location } from "./location";

export const mailyBeauport = {
  id: "maily-beauport",
  site,
  location,
} as const;
