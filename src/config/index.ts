// Tenant resolver. The active tenant is selected at BUILD time via process.env.TENANT
// (one static build per branded domain). Defaults to "ongles-maily" — the original
// Ongles Maily site — so local dev and the current deploy are unchanged.
//
// Consumers should keep importing `site` / `locations` from "@/lib/site" and
// "@/lib/locations" (thin re-exports of this module); those import paths are the
// stable public surface.

import { onglesMaily } from "./tenants/ongles-maily";
import { onglesCharlesbourg } from "./tenants/ongles-charlesbourg";
import { onglesRivieres } from "./tenants/ongles-rivieres";

const registry = {
  "ongles-maily": onglesMaily,
  "ongles-charlesbourg": onglesCharlesbourg,
  "ongles-rivieres": onglesRivieres,
} as const;

export type TenantId = keyof typeof registry;

const requested = process.env.TENANT ?? "ongles-maily";
if (!(requested in registry)) {
  // Fail loud at build time rather than silently serving the wrong brand.
  throw new Error(
    `Unknown TENANT="${requested}". Valid tenants: ${Object.keys(registry).join(", ")}`,
  );
}

export const tenant = registry[requested as TenantId];
export const site = tenant.site;
// Keep the array shape the legacy `locations` export had (consumers iterate it).
export const locations = [tenant.location];
export const services = tenant.services;
