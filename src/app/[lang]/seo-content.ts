import "server-only";
import type { Locale } from "@/lib/i18n";
import type { SeoDictionary } from "@/lib/seo-dictionary";
import { tenant } from "@/config";
import { readStoreSettings } from "@/lib/store-settings-store";
import { layeredLocaleContent } from "@/app/[lang]/layered-locale-content";
import { deepMerge } from "@/config/deep-merge";
import { liftLegacySeo } from "@/app/[lang]/legacy-seo-shim";
import baseFr from "@/config/seo/seo.fr.json";
import baseEn from "@/config/seo/seo.en.json";
import mailyFr from "@/config/tenants/ongles-maily/seo.fr.json";
import mailyEn from "@/config/tenants/ongles-maily/seo.en.json";
import charlesbourgFr from "@/config/tenants/ongles-charlesbourg/seo.fr.json";
import charlesbourgEn from "@/config/tenants/ongles-charlesbourg/seo.en.json";
import rivieresFr from "@/config/tenants/ongles-rivieres/seo.fr.json";
import rivieresEn from "@/config/tenants/ongles-rivieres/seo.en.json";
import templateFr from "@/config/tenants/template/seo.fr.json";
import templateEn from "@/config/tenants/template/seo.en.json";

// SEO is composed at request time from THREE layers (base -> tenant -> db) in a
// SEPARATE namespace from UI copy, cached per-tenant. See CONTEXT.md "Layered
// resolution". The db layer lifts legacy content-namespace SEO (pre-9242623 rows)
// as a floor beneath explicit `seo` edits until re-entered via the admin.

type Content = Record<string, unknown>;

const base: Record<Locale, Content> = { fr: baseFr, en: baseEn };

const overrides: Record<string, Record<Locale, Content>> = {
  "ongles-maily": { fr: mailyFr, en: mailyEn },
  "ongles-charlesbourg": { fr: charlesbourgFr, en: charlesbourgEn },
  "ongles-rivieres": { fr: rivieresFr, en: rivieresEn },
  template: { fr: templateFr, en: templateEn },
};

export const getSeo = layeredLocaleContent<SeoDictionary>({
  base,
  tenants: overrides,
  tenantId: tenant.id,
  cacheKey: "store-seo",
  tag: `store-seo:${tenant.id}`,
  readSettings: readStoreSettings,
  readDbLayer: (settings, locale) => {
    const legacy = liftLegacySeo(settings?.content?.[locale] as Content | undefined);
    const current = (settings?.seo?.[locale] as Content | undefined) ?? {};
    if (Object.keys(legacy).length > 0) {
      // Operational migration signal: surfaces tenants still carrying legacy
      // content-namespace SEO so it can be re-entered and this shim removed.
      console.warn(
        `[seo-shim] lifted legacy content SEO for ${tenant.id}/${locale}: ${Object.keys(
          legacy,
        ).join(", ")}`,
      );
    }
    // Legacy is the floor; explicit `seo` edits win on leaf collisions.
    return deepMerge(legacy, current);
  },
});
