import "server-only";
import type { Dictionary } from "@/lib/dictionary";
import { tenant } from "@/config";
import { readStoreSettings } from "@/lib/store-settings-store";
import { layeredLocaleContent } from "@/app/[lang]/layered-locale-content";
import { BASE_CONTENT, TENANT_CONTENT } from "@/config/tenant-content";

// The dictionary is composed at request time from THREE layers (base -> tenant ->
// db), cached per-tenant. See CONTEXT.md "Layered resolution". Locale parity
// (fr <-> en key structure) is enforced by seo-parity.test.ts / dictionaries.test.ts.

type Content = Record<string, unknown>;

export const getDictionary = layeredLocaleContent<Dictionary>({
  base: BASE_CONTENT,
  tenants: TENANT_CONTENT,
  tenantId: tenant.id,
  cacheKey: "store-content",
  tag: `store-content:${tenant.id}`,
  readSettings: readStoreSettings,
  readDbLayer: (settings, locale) =>
    (settings?.content?.[locale] as Content | undefined) ?? {},
});
