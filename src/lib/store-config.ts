import { cache } from "react";
import { unstable_cache } from "next/cache";
import { site as staticSite, locations as staticLocations, services as staticServices } from "@/config";
import { tenant } from "@/config";
import { deepMerge } from "@/config/deep-merge";
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

// ── Cached resolver ───────────────────────────────────────────────────────────
// unstable_cache: cross-request cache (60 s revalidate). Tagged so admin
// writes can call revalidateTag(`store-config:${tenant.id}`) to purge.
//
// unstable_cache requires the Next.js incremental cache runtime and throws
// outside a Next.js server context (e.g. bun:test). We fall back to the
// uncached resolver transparently so tests and non-Next environments work.
const cachedResolve = unstable_cache(resolveStoreConfig, ["store-config", tenant.id], {
  tags: [`store-config:${tenant.id}`],
  revalidate: 60,
});

async function resolveWithFallback(): ReturnType<typeof resolveStoreConfig> {
  try {
    return await cachedResolve();
  } catch {
    // Outside a Next.js runtime (tests, scripts) — run uncached.
    return resolveStoreConfig();
  }
}

// React cache: per-request dedupe so multiple components calling getStoreConfig
// in the same render tree only hit the Next.js cache once.
export const getStoreConfig = cache(resolveWithFallback);
