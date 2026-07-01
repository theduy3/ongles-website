// template tenant — neutral placeholder, the clone source for new salon sites.
import { site } from "./site";
import { location } from "./location";
import { services } from "./services";
import reviewData from "./google-reviews.json";
import contentFr from "./content.fr.json";
import contentEn from "./content.en.json";
import seoFr from "./seo.fr.json";
import seoEn from "./seo.en.json";
import faqFr from "./faq.fr.json";
import faqEn from "./faq.en.json";

export const template = {
  id: "template",
  site,
  location,
  services,
  reviewData,
  content: { fr: contentFr, en: contentEn },
  seo: { fr: seoFr, en: seoEn },
  faq: { fr: faqFr, en: faqEn },
} as const;
