import "server-only";
import type { SeoDictionary } from "@/lib/seo-dictionary";
import { tenant } from "@/config";
import { readStoreSettings } from "@/lib/store-settings-store";
import { layeredLocaleContent } from "@/app/[lang]/layered-locale-content";
import { deepMerge } from "@/config/deep-merge";
import { liftLegacySeo } from "@/app/[lang]/legacy-seo-shim";
import { BASE_SEO, TENANT_SEO } from "@/config/tenant-content";

// SEO is composed at request time from THREE layers (base -> tenant -> db) in a
// SEPARATE namespace from UI copy, cached per-tenant. See CONTEXT.md "Layered
// resolution". The db layer lifts legacy content-namespace SEO (pre-9242623 rows)
// as a floor beneath explicit `seo` edits until re-entered via the admin.

type Content = Record<string, unknown>;

export const getSeo = layeredLocaleContent<SeoDictionary>({
  base: BASE_SEO,
  tenants: TENANT_SEO,
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
