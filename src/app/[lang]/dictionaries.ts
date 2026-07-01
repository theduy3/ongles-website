import "server-only";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionary";
import { tenant } from "@/config";
import { readStoreSettings } from "@/lib/store-settings-store";
import { layeredLocaleContent } from "@/app/[lang]/layered-locale-content";
import baseFr from "@/config/base/content.fr.json";
import baseEn from "@/config/base/content.en.json";
import mailyFr from "@/config/tenants/ongles-maily/content.fr.json";
import mailyEn from "@/config/tenants/ongles-maily/content.en.json";
import charlesbourgFr from "@/config/tenants/ongles-charlesbourg/content.fr.json";
import charlesbourgEn from "@/config/tenants/ongles-charlesbourg/content.en.json";
import rivieresFr from "@/config/tenants/ongles-rivieres/content.fr.json";
import rivieresEn from "@/config/tenants/ongles-rivieres/content.en.json";
import templateFr from "@/config/tenants/template/content.fr.json";
import templateEn from "@/config/tenants/template/content.en.json";

// The dictionary is composed at request time from THREE layers (base -> tenant ->
// db), cached per-tenant. See CONTEXT.md "Layered resolution". Locale parity
// (fr <-> en key structure) is enforced by seo-parity.test.ts / dictionaries.test.ts.

type Content = Record<string, unknown>;

const base: Record<Locale, Content> = { fr: baseFr, en: baseEn };

const overrides: Record<string, Record<Locale, Content>> = {
  "ongles-maily": { fr: mailyFr, en: mailyEn },
  "ongles-charlesbourg": { fr: charlesbourgFr, en: charlesbourgEn },
  "ongles-rivieres": { fr: rivieresFr, en: rivieresEn },
  template: { fr: templateFr, en: templateEn },
};

export const getDictionary = layeredLocaleContent<Dictionary>({
  base,
  tenants: overrides,
  tenantId: tenant.id,
  cacheKey: "store-content",
  tag: `store-content:${tenant.id}`,
  readSettings: readStoreSettings,
  readDbLayer: (settings, locale) =>
    (settings?.content?.[locale] as Content | undefined) ?? {},
});
