// Single owner of the per-tenant cache tag names. Every request-time tenant
// resource (store-config, the content dictionary, the SEO dictionary) is cached
// under a tag `<namespace>:<tenantId>` via cachedTenantResource, and every one
// of them derives from the same Supabase store-settings doc — so an admin write
// must purge all of them at once (see revalidateStoreCaches in
// @/lib/revalidate-store-caches). Registration and invalidation both derive
// their tags from here, so the two sides cannot drift into a silent stale-cache
// bug. This module stays framework-free (no next/cache import) so registration
// modules — and their tests — never transitively pull server-only APIs.

export const STORE_CACHE_NAMESPACES = [
  "store-config",
  "store-content",
  "store-seo",
] as const;

export type StoreCacheNamespace = (typeof STORE_CACHE_NAMESPACES)[number];

/** Tag for one namespace + tenant. Used at cache registration. */
export function storeCacheTag(
  namespace: StoreCacheNamespace,
  tenantId: string,
): string {
  return `${namespace}:${tenantId}`;
}

/** Every store cache tag for a tenant — the full set purged on a settings write. */
export function storeCacheTags(tenantId: string): string[] {
  return STORE_CACHE_NAMESPACES.map((ns) => storeCacheTag(ns, tenantId));
}
