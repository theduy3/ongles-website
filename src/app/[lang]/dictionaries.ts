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
import mailyFr from "@/config/tenants/maily-beauport/content.fr.json";
import mailyEn from "@/config/tenants/maily-beauport/content.en.json";

type Content = Record<string, unknown>;

const base: Record<Locale, Content> = { fr: baseFr, en: baseEn };

// Per-tenant content overrides. Only tenants with authored content appear here;
// any other tenant inherits base alone until its copy is authored.
const overrides: Record<string, Record<Locale, Content>> = {
  "maily-beauport": { fr: mailyFr, en: mailyEn },
};

export const getDictionary = async (locale: Locale): Promise<Dictionary> => {
  const override = overrides[tenant.id]?.[locale] ?? {};
  return deepMerge(base[locale], override) as unknown as Dictionary;
};
