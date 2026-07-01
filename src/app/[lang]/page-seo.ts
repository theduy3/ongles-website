import "server-only";
import type { Locale } from "@/lib/i18n";
import type { GalleryImage } from "@/lib/gallery";
import { tenant } from "@/config";
import { getStoreConfig } from "@/lib/store-config";
import { reviewDataFor } from "@/config/review-honesty";
import {
  pageMetadata,
  breadcrumbGraph,
  serviceGraph,
  servicesGraph,
  pricingGraph,
  imageGalleryGraph,
  organizationGraph,
  faqPageGraph,
} from "@/lib/seo";

// The per-request SEO EMITTER surface — distinct from getSeo (seo-content.ts),
// which resolves the SEO *words* (titles, descriptions, schema copy). getPageSeo
// resolves the *machine-readable emitters*: Metadata + JSON-LD builders, each
// pre-bound to this request's resolved config (site, locations) and the tenant's
// R-02 review gate data. Pages call `page.breadcrumb([...])` instead of
// hand-threading `{ site, locations }` (and reviewData) into every seo.ts builder.
//
// The builders in @/lib/seo stay pure — this is a thin binding adapter over them,
// so their unit tests (seo.test.ts) remain the test surface.

type MetadataOpts = {
  title: string;
  description: string;
  routeByLocale?: Record<Locale, string>;
};
type ServiceItem = Parameters<typeof serviceGraph>[1];
type Crumbs = Parameters<typeof breadcrumbGraph>[1];
type FaqItems = Parameters<typeof faqPageGraph>[0];

/** Bound SEO emitters for one request (locale + resolved config + gate data). */
export async function getPageSeo(lang: Locale) {
  const { site, locations } = await getStoreConfig();
  const cfg = { site, locations };
  const reviewData = reviewDataFor(tenant);

  return {
    metadata: (route: string, opts: MetadataOpts) => pageMetadata(lang, route, opts, cfg),
    breadcrumb: (crumbs: Crumbs) => breadcrumbGraph(lang, crumbs, cfg),
    service: (item: ServiceItem) => serviceGraph(lang, item, cfg),
    services: (items: readonly ServiceItem[]) => servicesGraph(lang, items, cfg),
    pricing: (items: readonly ServiceItem[]) => pricingGraph(lang, items, cfg),
    gallery: (
      name: string,
      images: readonly GalleryImage[],
      textFor: (id: string) => { alt: string; caption: string },
    ) => imageGalleryGraph(name, images, textFor, cfg),
    organization: (arg: { name: string; description: string }) =>
      organizationGraph(lang, arg, { ...cfg, reviewData }),
    faq: (items: FaqItems) => faqPageGraph(items),
  };
}
