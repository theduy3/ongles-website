import "server-only";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionary";
import { tenant } from "@/config";
import { deepMerge } from "@/config/deep-merge";

// The dictionary is composed at request time from a shared BASE (generic UI chrome,
// identical for every tenant) plus the ACTIVE tenant's OVERRIDE (SEO meta + any
// brand/location-specific copy). Loads server-side only, so the JSON never ships to
// the client bundle. Locale parity (fr ⇔ en key structure) holds within base and
// within each tenant override — see AGENTS.md.
import baseFr from "@/config/base/content.fr.json";
import baseEn from "@/config/base/content.en.json";
import mailyFr from "@/config/tenants/ongles-maily/content.fr.json";
import mailyEn from "@/config/tenants/ongles-maily/content.en.json";
import charlesbourgFr from "@/config/tenants/ongles-charlesbourg/content.fr.json";
import charlesbourgEn from "@/config/tenants/ongles-charlesbourg/content.en.json";
import rivieresFr from "@/config/tenants/ongles-rivieres/content.fr.json";
import rivieresEn from "@/config/tenants/ongles-rivieres/content.en.json";

type Content = Record<string, unknown>;

const base: Record<Locale, Content> = { fr: baseFr, en: baseEn };

// Per-tenant content overrides. Each tenant supplies its own SEO meta + brand copy.
const overrides: Record<string, Record<Locale, Content>> = {
  "ongles-maily": { fr: mailyFr, en: mailyEn },
  "ongles-charlesbourg": { fr: charlesbourgFr, en: charlesbourgEn },
  "ongles-rivieres": { fr: rivieresFr, en: rivieresEn },
};

export const getDictionary = async (locale: Locale): Promise<Dictionary> => {
  const override = overrides[tenant.id]?.[locale] ?? {};
  return deepMerge(base[locale], override) as unknown as Dictionary;
};
