// config-completeness.ts
// Pure config-completeness validator — no Next.js imports, no process.env reads,
// no side effects. Safe to import from both bun:test and next.config.ts.
//
// Encodes exactly the required-core bar from the context decisions:
//   D-06: required-core fields must be real (non-empty, non-placeholder)
//   D-07: Google Maps socialProfile required-if-exists (empty array = deferred-OK)
//   D-08: gift-certificate URL is deferred-OK, not validated here
//   D-03: template tenant excluded from the completeness bar
//
// IMPORTANT — EXCLUDED_TENANTS behavior: any tenant NOT in this Set with an
// incomplete required-core config will FAIL the production build. A new tenant
// added to TENANT_REGISTRY before its config is fully filled must either be
// completed first OR temporarily added to EXCLUDED_TENANTS here. This is the
// intended strong-guard behavior for this milestone. A `draft: true` registry
// flag is deferred (not Phase 1 scope).

import z from "zod";
import { TENANT_REGISTRY } from "./index";
import { EXCLUDED_TENANTS } from "./excluded-tenants";

// ─── Zod sub-schemas ──────────────────────────────────────────────────────────────

const GeoSchema = z.object({
  lat: z
    .number()
    .refine((n) => n !== 0, "must be real coordinates (not 0 — confirm real geo)"),
  lng: z
    .number()
    .refine((n) => n !== 0, "must be real coordinates (not 0 — confirm real geo)"),
});

const AddressSchema = z.object({
  street: z.string().min(1, "street required"),
  city: z.string().min(1, "city required"),
  region: z.string().min(1, "region required"),
  postalCode: z.string().min(1, "postalCode required"),
  country: z.string().min(1, "country required"),
});

/** Service-level required-core: price and priceTo must be positive and priceTo >= price. */
const ServiceSchema = z.object({
  id: z.string().min(1, "service id required"),
  price: z.number().positive("price must be > 0"),
  priceTo: z.number().positive("priceTo must be > 0"),
}).refine(
  (s) => s.priceTo >= s.price,
  { message: "priceTo must be >= price", path: ["priceTo"] },
);

/**
 * Required-core schema for the site node.
 * Validates only the fields in D-06/D-07; D-08 fields (giftCertificate) are omitted.
 */
const SiteRequiredCoreSchema = z.object({
  name: z.string().min(1, "name required"),
  url: z.string().url("url must be a valid URL"),
  storeId: z
    .string()
    .min(1, "storeId required")
    .refine(
      (v) => v !== "XX",
      'storeId must not be template placeholder "XX" — confirm real SalonX store code',
    ),
  geo: GeoSchema,
  // hours is the schema.org blocks array on the site; validated only for non-empty.
  hours: z.array(z.any()).min(1, "site.hours must be non-empty"),
  contact: z.object({
    email: z.string().email("contact.email must be a valid email address"),
    phone: z.string().min(1, "contact.phone required"),
    address: AddressSchema,
  }),
  // D-07: empty array = no GBP yet = deferred-OK. Any entry containing
  // "google.com/maps" MUST include a real numeric CID (cid=<digits>).
  socialProfiles: z.array(z.string()).refine(
    (profiles) =>
      profiles
        .filter((p) => p.includes("google.com/maps"))
        .every((p) => /cid=\d+/.test(p)),
    "Google Maps entry in socialProfiles must contain a real CID (cid=<digits>)",
  ),
});

/** Required-core schema for the location node. */
const LocationRequiredCoreSchema = z.object({
  geo: GeoSchema,
  hours: z.array(z.any()).min(1, "location.hours must be non-empty"),
  hoursSpec: z.array(z.any()).min(1, "location.hoursSpec must be non-empty"),
});

/** Full required-core schema — the completeness bar for one tenant config. */
const TenantCoreSchema = z.object({
  site: SiteRequiredCoreSchema,
  location: LocationRequiredCoreSchema,
  services: z.array(ServiceSchema).min(1, "services must be non-empty"),
});

// ─── Public types ─────────────────────────────────────────────────────────────────

/** Per-tenant validation error summary. */
export type ConfigCompletenessError = {
  tenantId: string;
  errors: string[];
};

/** Result of a single-config validation call. */
export type ConfigValidationResult =
  | { success: true }
  | { success: false; errors: string[] };

// ─── Helpers ──────────────────────────────────────────────────────────────────────

/**
 * Validate a single raw config object against the required-core schema.
 * Used by validateAllTenants (one source of truth) and by tests for negative guards.
 */
export function validateConfig(config: unknown): ConfigValidationResult {
  const result = TenantCoreSchema.safeParse(config);
  if (result.success) {
    return { success: true };
  }
  const errors = result.error.issues.map(
    (issue) => `[${issue.path.join(".")}] ${issue.message}`,
  );
  return { success: false, errors };
}

// ─── Public API ───────────────────────────────────────────────────────────────────

/**
 * Iterates all non-excluded tenants in TENANT_REGISTRY and validates each against
 * the required-core completeness bar (D-06/D-07/D-08). Returns an array of
 * per-tenant errors. An empty array means all tenants pass.
 */
export function validateAllTenants(): ConfigCompletenessError[] {
  const failures: ConfigCompletenessError[] = [];

  for (const [id, config] of Object.entries(TENANT_REGISTRY)) {
    if (EXCLUDED_TENANTS.has(id)) continue;

    const result = validateConfig(config);
    if (!result.success) {
      failures.push({ tenantId: id, errors: result.errors });
    }
  }

  return failures;
}

/**
 * Asserts that every non-excluded tenant in TENANT_REGISTRY passes the required-core
 * completeness check. Throws a formatted Error listing every failing tenant and
 * field path/message. Returns silently when all tenants pass.
 *
 * Designed to be called from next.config.ts under PHASE_PRODUCTION_BUILD so an
 * incomplete config aborts `next build` (exit 1 via Next.js printAndExit).
 */
export function assertAllTenantsComplete(): void {
  const failures = validateAllTenants();
  if (failures.length === 0) return;

  const message = failures
    .map(
      ({ tenantId, errors }) =>
        `Tenant "${tenantId}" has incomplete required-core config:\n${errors.join("\n")}`,
    )
    .join("\n\n");

  throw new Error(
    `\n\nConfig completeness check FAILED — fix before deploying:\n\n${message}\n`,
  );
}
