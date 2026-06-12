// Tenant resolver. The active tenant is selected at RUNTIME via process.env.TENANT
// (one universal image; each container sets its own TENANT). Defaults to "ongles-maily".
// Tenant-content routes are dynamic (see [lang]/layout.tsx) so the standalone server
// resolves this per deployment, not at build time.
//
// Consumers should keep importing `site` / `locations` from "@/lib/site" and
// "@/lib/locations" (thin re-exports of this module); those import paths are the
// stable public surface.

import { onglesMaily } from "./tenants/ongles-maily";
import { onglesCharlesbourg } from "./tenants/ongles-charlesbourg";
import { onglesRivieres } from "./tenants/ongles-rivieres";
import { template } from "./tenants/template";

export const TENANT_REGISTRY = {
  "ongles-maily": onglesMaily,
  "ongles-charlesbourg": onglesCharlesbourg,
  "ongles-rivieres": onglesRivieres,
  template,
} as const;

export type TenantId = keyof typeof TENANT_REGISTRY;

export function resolveTenant(requested: string | undefined) {
  const id = requested ?? "ongles-maily";
  if (!(id in TENANT_REGISTRY)) {
    // Fail loud rather than silently serving the wrong brand.
    throw new Error(
      `Unknown TENANT="${id}". Valid tenants: ${Object.keys(TENANT_REGISTRY).join(", ")}`,
    );
  }
  return TENANT_REGISTRY[id as TenantId];
}

export const tenant = resolveTenant(process.env.TENANT);
export const site = tenant.site;
// Keep the array shape the legacy `locations` export had (consumers iterate it).
export const locations = [tenant.location];
export const services = tenant.services;
