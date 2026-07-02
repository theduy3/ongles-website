// Pricing presenter. Turns the resolved service list into the two render-ready
// shapes the /tarifs (FR) and /pricing (EN) pages need: `rows` for the
// PricingTable and `graphItems` for the pricing JSON-LD (page.pricing). Owning
// both in one place means a service's name and price can't diverge between the
// visible table and the structured data — the divergence a presenter prevents
// is a real defect (both pages had inlined the identical transform twice).
//
// Fail-loud: a missing service title is a locale-parity defect (guarded at build
// time by schema-invariants), so we index unguarded rather than fabricate a name
// from the id — a fabricated name would leak into Google-read JSON-LD.

import type { Locale } from "@/lib/i18n";
import type { Service, ServiceId } from "@/config/types";
import type { PricingRow } from "@/components/PricingTable";
import type { ServiceItem } from "@/lib/seo";
import { servicePath } from "@/lib/services";

export function buildPricingItems(
  lang: Locale,
  services: readonly Service[],
  serviceTitles: Record<ServiceId, { title: string }>,
  seoServices: Record<ServiceId, { schemaDescription: string }>,
): { rows: PricingRow[]; graphItems: ServiceItem[] } {
  const rows: PricingRow[] = services.map((service) => ({
    id: service.id,
    name: serviceTitles[service.id].title,
    href: `/${lang}${servicePath(service, lang)}`,
    price: service.price,
    priceTo: service.priceTo,
  }));

  const graphItems: ServiceItem[] = services.map((service) => ({
    name: serviceTitles[service.id].title,
    description: seoServices[service.id].schemaDescription,
    price: service.price,
    priceTo: service.priceTo,
    path: servicePath(service, lang),
  }));

  return { rows, graphItems };
}
