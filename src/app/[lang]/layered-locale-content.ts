import { deepMerge } from "@/config/deep-merge";
import { cachedTenantResource } from "@/lib/cached-tenant-resource";
import type { Locale } from "@/lib/i18n";
import type { StoreSettings } from "@/lib/store-settings-schema";

type Content = Record<string, unknown>;

/**
 * Internal 3-layer compose: base -> tenant -> db. Later layers win on leaf
 * collisions; deep-merges recursively. Exported so precedence is unit-testable.
 * (Replaces the byte-identical compose-dictionary.ts / compose-seo.ts.)
 */
export function composeLayers(base: Content, tenant: Content, db: Content): Content {
  return deepMerge(deepMerge(base, tenant), db);
}

/**
 * Factory for a per-locale layered-content resolver (the dictionary and SEO
 * namespaces). Caches ONLY the db override layer (behavior-identical to the
 * resolvers it replaces), then composes base -> tenant -> db outside the cache.
 * `readSettings` is injected so the layering + db-shaping is testable without a
 * Next.js/Supabase runtime.
 */
export function layeredLocaleContent<T>({
  base,
  tenants,
  tenantId,
  cacheKey,
  tag,
  readSettings,
  readDbLayer,
}: {
  base: Record<Locale, Content>;
  tenants: Record<string, Record<Locale, Content>>;
  tenantId: string;
  cacheKey: string;
  tag: string;
  readSettings: () => Promise<StoreSettings | null>;
  readDbLayer: (settings: StoreSettings | null, locale: Locale) => Content;
}): (locale: Locale) => Promise<T> {
  // Cache the db layer only (small, dynamic part) — matches the prior resolvers.
  const resolveDbLayer = async (locale: Locale): Promise<Content> =>
    readDbLayer(await readSettings(), locale);

  const getDbLayer = cachedTenantResource(
    [cacheKey, tenantId],
    { tags: [tag] },
    resolveDbLayer,
  );

  return async (locale: Locale): Promise<T> => {
    const db = await getDbLayer(locale);
    const tenantLayer = tenants[tenantId]?.[locale] ?? {};
    return composeLayers(base[locale], tenantLayer, db) as unknown as T;
  };
}
