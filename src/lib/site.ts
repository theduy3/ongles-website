// Brand + primary-location facts for the ACTIVE tenant. The data now lives in
// per-tenant config under src/config/tenants/<id>/; this module is a thin
// re-export kept as the stable import path ("@/lib/site") for existing consumers.
// The active tenant is chosen at build time via process.env.TENANT — see
// src/config/index.ts.
export { site } from "@/config";
