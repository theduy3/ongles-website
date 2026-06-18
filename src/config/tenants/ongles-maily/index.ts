// ongles-maily tenant config — the primary Ongles Maily site (default tenant).
import { site } from "./site";
import { location } from "./location";
import { services } from "./services";
import reviewData from "./google-reviews.json";

export const onglesMaily = {
  id: "ongles-maily",
  site,
  location,
  services,
  reviewData,
} as const;
