import "server-only";
import { cache } from "react";
import type { Locale } from "@/lib/i18n";
import { tenant } from "@/config";
import type { FaqItem } from "@/config/types";
import frDict from "@/dictionaries/fr.json";
import enDict from "@/dictionaries/en.json";
import mailyFaqFr from "@/config/tenants/ongles-maily/faq.fr.json";
import mailyFaqEn from "@/config/tenants/ongles-maily/faq.en.json";
import charlesbourgFaqFr from "@/config/tenants/ongles-charlesbourg/faq.fr.json";
import charlesbourgFaqEn from "@/config/tenants/ongles-charlesbourg/faq.en.json";
import rivieresFaqFr from "@/config/tenants/ongles-rivieres/faq.fr.json";
import rivieresFaqEn from "@/config/tenants/ongles-rivieres/faq.en.json";
import templateFaqFr from "@/config/tenants/template/faq.fr.json";
import templateFaqEn from "@/config/tenants/template/faq.en.json";

// Request-time FAQ loader. Mirrors dictionaries.ts / seo-content.ts: server-only,
// react-cached, static @/ imports. CONTENT-02: the FAQ shown on /faq is the union
// of this tenant's own facts (per-tenant faq.{locale}.json) and the de-tenanted
// shared base (dictionaries faq.items), tenant-first per D-06.
//
// IMPORTANT: this module is request-time ONLY. It MUST NOT be imported by
// schema-invariants.ts / next.config.ts — the build guard has its own
// relative-path JSON imports (Pitfall 1/4). @/ aliases here are fine.

export type { FaqItem };

const baseFaq: Record<Locale, readonly FaqItem[]> = {
  fr: frDict.faq.items,
  en: enDict.faq.items,
};

const tenantFaq: Record<string, Record<Locale, readonly FaqItem[]>> = {
  "ongles-maily": { fr: mailyFaqFr.items, en: mailyFaqEn.items },
  "ongles-charlesbourg": { fr: charlesbourgFaqFr.items, en: charlesbourgFaqEn.items },
  "ongles-rivieres": { fr: rivieresFaqFr.items, en: rivieresFaqEn.items },
  template: { fr: templateFaqFr.items, en: templateFaqEn.items },
};

/**
 * Pure merge — per-tenant facts lead, then the shared base (D-06). Returns a NEW
 * array; never mutates either input. `a` text is carried verbatim (D-30).
 */
export function mergeFaqItems(
  base: readonly FaqItem[],
  tenantItems: readonly FaqItem[],
): FaqItem[] {
  return [...tenantItems, ...base];
}

function resolveTenantFaq(locale: Locale): FaqItem[] {
  const base = baseFaq[locale] ?? [];
  const perTenant = tenantFaq[tenant.id]?.[locale] ?? [];
  return mergeFaqItems(base, perTenant);
}

/** Request-cached merged FAQ for the active tenant in the given locale. */
export const getTenantFaq = cache(resolveTenantFaq);
