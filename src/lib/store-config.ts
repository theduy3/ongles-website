import { site as staticSite, locations as staticLocations, services as staticServices } from "@/config";
import { tenant } from "@/config";
import { deepMerge } from "@/config/deep-merge";
import { cachedTenantResource } from "@/lib/cached-tenant-resource";
import { readStoreSettings } from "@/lib/store-settings-store";
import type { TenantSite, Location, Service } from "@/config/types";
import type { StoreSettings } from "@/lib/store-settings-schema";

// Merge layer: merges sparse Supabase override doc over static tenant config.
// Caching strategy:
//   1. React `cache` — per-request dedupe (one DB call per render tree).
//   2. `unstable_cache` — cross-request Next.js cache (60 s TTL, tagged so
//      admin writes can revalidate via `revalidateTag("store-config:<id>")`.

// ── Services merge-by-id ──────────────────────────────────────────────────────
// Unlike site/location where deepMerge handles the recursion, services are an
// array and arrays replace wholesale in deepMerge. We need identity-keyed
// patching: for each static service, apply any matching override item's value
// fields (price, priceTo, photo) while preserving structural keys (id, slug).
// Returns a NEW array of NEW objects — never mutates the static services.

type ServiceOverride = { id: string; price?: number; priceTo?: number; photo?: boolean };

export function mergeServicesById(
  staticSvcs: readonly Service[],
  overrides: ServiceOverride[],
): Service[] {
  // Index overrides by id for O(1) lookup.
  const overrideMap = new Map<string, ServiceOverride>();
  for (const o of overrides) {
    overrideMap.set(o.id, o);
  }

  return staticSvcs.map((svc) => {
    const o = overrideMap.get(svc.id);
    if (!o) return { ...svc }; // no override — return immutable copy
    return {
      ...svc,
      // Apply only the value fields present in the override item.
      ...(o.price !== undefined && { price: o.price }),
      ...(o.priceTo !== undefined && { priceTo: o.priceTo }),
      ...(o.photo !== undefined && { photo: o.photo }),
    };
  });
}

// ── Core resolver (uncached) ─────────────────────────────────────────────────

async function resolveStoreConfig(): Promise<{
  site: TenantSite;
  locations: Location[];
  services: readonly Service[];
  customCode: NonNullable<StoreSettings["customCode"]>;
}> {
  const override = await readStoreSettings();

  if (!override) {
    // No DB row (or Supabase absent) — return static defaults unchanged.
    return {
      site: staticSite,
      locations: staticLocations,
      services: staticServices,
      customCode: [],
    };
  }

  // site: deepMerge (plain objects recurse; arrays replace wholesale).
  const mergedSite = deepMerge(staticSite as Record<string, unknown>, override.site ?? {}) as TenantSite;

  // location: deepMerge the single primary location with the location override.
  const primaryLocation = staticLocations[0];
  const mergedLocation = deepMerge(
    primaryLocation as Record<string, unknown>,
    override.location ?? {},
  ) as Location;

  // services: merge by id so slug/id are preserved and only value fields patch.
  const mergedServices = mergeServicesById(staticServices, override.services ?? []);

  return {
    site: mergedSite,
    locations: [mergedLocation],
    services: mergedServices,
    customCode: override.customCode ?? [],
  };
}

// Cross-request cache (60 s) + per-request dedupe + non-Next fallback, via the
// shared caching seam. Tagged so admin writes can revalidateTag(`store-config:${id}`).
export const getStoreConfig = cachedTenantResource(
  ["store-config", tenant.id],
  { tags: [`store-config:${tenant.id}`] },
  resolveStoreConfig,
);
