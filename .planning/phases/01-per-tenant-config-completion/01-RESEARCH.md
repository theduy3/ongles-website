# Phase 1: Per-Tenant Config Completion — Research

**Researched:** 2026-06-17
**Domain:** TypeScript config validation + Next.js build lifecycle
**Confidence:** HIGH — all findings verified against local source files

---

## Project Constraints (from CLAUDE.md / AGENTS.md)

- This Next.js is version **16.2.6** — APIs may differ from training data. Verified against `node_modules/next/dist/`.
- Locale files (`fr.json`, `en.json`) must keep identical key structure.
- `force-dynamic` mandatory on all tenant-content routes.
- Never hardcode tenant data; always resolve via `getStoreConfig()` / `resolveTenant()`.
- Zod is the project's validation idiom (per `rules/typescript/coding-style.md`). Use `import z from "zod"` (default import — confirmed from `src/lib/store-settings-schema.ts`).
- No `console.log` in production code.
- Test files: `src/**/*.test.ts`, run via `bun test src/`.
- Docker build stage uses `node:20-alpine` + `npm run build` (not `bun run build`).

---

## Framework Quick Reference

**Next.js version:** 16.2.6 [VERIFIED: `package.json`]
**React:** 19.2.4, **TypeScript:** ^5 strict, **Zod:** 4.4.3 [VERIFIED: `package.json`]
**Bun:** 1.3.14 (local dev/test), **Node:** 20-alpine (Docker build)

### Build lifecycle facts (verified from `node_modules/next/dist/`)

**How next.config.ts is loaded** [VERIFIED: `node_modules/next/dist/server/config.js` line 1221, `node_modules/next/dist/build/next-config-ts/transpile-config.js`, `node_modules/next/dist/build/next-config-ts/require-hook.js`]:

1. Next.js registers SWC-based `require.extensions` hooks for `.ts`, `.mts`, `.cts`, `.cjs`, `.mjs` **before** loading `next.config.ts`. Every subsequent `require()` of a `.ts` file is transpiled by SWC inline.
2. `transpileConfig()` then loads `next.config.ts`. On Node 22+ it uses native TS import; on Node 20 (Docker) it falls back to SWC — the require hooks are active either way.
3. If `next.config.ts` exports a function, `normalizeConfig()` calls it: `config = config(phase, { defaultConfig })` with no try/catch, then `return await config`. A thrown error propagates out unhandled.
4. The unhandled rejection flows to `next-build.js`'s `.catch()` → `printAndExit(err)` → `process.exit(1)`. [VERIFIED: `node_modules/next/dist/cli/next-build.js` tail + `node_modules/next/dist/server/lib/utils.js` line 69: `function printAndExit(message, code = 1)`]

**Conclusion:** Throwing inside `next.config.ts` (async function form) **reliably aborts `next build` with exit code 1** and propagates the error message to stdout/stderr.

**Phase constants** [VERIFIED: `node_modules/next/dist/shared/lib/constants.js`]:
```
PHASE_PRODUCTION_BUILD = 'phase-production-build'
PHASE_DEVELOPMENT_SERVER = 'phase-development-server'
```
The config function receives `phase` as its first argument, enabling guard-on-build-only behavior.

**Implication for `next dev`:** If the validator runs inside the config function unconditionally, it also runs on `next dev` startup. Gate it with `phase === PHASE_PRODUCTION_BUILD` to avoid blocking local dev with incomplete configs (the bun:test already covers local feedback).

---

## TODO Inventory (complete field-level list)

Both incomplete tenants share the same 5 TODO categories. [VERIFIED: grep of `src/config/tenants/ongles-charlesbourg/` and `src/config/tenants/ongles-rivieres/`]

| Field | Location in code | D-0x bar |
|-------|-----------------|----------|
| `site.storeId` | `site.ts:storeId` | D-06 required-core |
| `site.geo` | `site.ts:geo` | D-06 required-core (real, not approx) |
| `site.contact.email` | `site.ts:contact.email` | D-06 required-core |
| `location.geo` | `location.ts:geo` | D-06 required-core (real, not approx) |
| Service `price`/`priceTo` (all 4) | `services.ts` | D-06 required-core (per-tenant, not mirrored from maily) |
| `site.booker.giftCertificate` | `site.ts:booker.giftCertificate` | D-08 deferred-OK |
| `site.socialProfiles` (Maps CID) | `site.ts:socialProfiles` | D-07 required-if-exists |

**Fields already populated in both tenants:** `name`, `url`, `widgetHost`, `booking`, `priceRange`, `contact.phone`/`phoneHref`/`address`/`landmark`, `hours`, `hoursSpec`, `location.address`, `location.phone`, `location.hours`, `location.hoursSpec`.

**Note on `site.hours` vs `location.hoursSpec`:** Both tenants already have hours arrays. The validator must check non-empty but does not need to detect placeholder values here.

**Template tenant placeholder patterns** (must be excluded from validator or explicitly detected): `storeId: "XX"`, `geo: { lat: 0, lng: 0 }`, `email: "hello@example.com"`. [VERIFIED: `src/config/tenants/template/site.ts`]

---

## Recommendation: Validator

### Shape: Zod schema over the existing TS types

**Recommendation:** Use a zod schema directly. Do NOT use an explicit required-field list (array of string paths + manual traversal).

**Rationale:**
- Zod is already the project idiom (`store-settings-schema.ts` uses it extensively with the same `import z from "zod"` default-import pattern). [VERIFIED: `src/lib/store-settings-schema.ts`]
- An explicit field list requires manual `get(obj, path)` traversal — error-prone and not type-guided. Zod gives you the type contract enforcement for free.
- The zod v4.4.3 API (`z.string().min(1)`, `z.number().refine(...)`, `z.array().min(1)`) works exactly as expected — verified via `node -e` test run against the installed package.
- `z.infer<typeof Schema>` gives a derived type that stays in sync — no drift between the schema and the validation rules.

**What to NOT do:** Do not attempt to derive a zod schema by `z.infer` from the existing `TenantSite` / `Location` / `Service` TypeScript types using `z.object()`. Those types use `readonly`, optional fields, and `as const` literals that don't map cleanly into zod's runtime schema without manual mapping anyway. Write the validator schema from scratch with only the required-core fields.

### Required-core fields to validate per tenant

Based on D-06/D-07/D-08 and the actual field inventory: [VERIFIED against `src/config/types.ts` and tenant files]

**Hard required (non-empty, non-placeholder):**
- `site.name` — `z.string().min(1)`
- `site.url` — `z.string().url()`
- `site.storeId` — `z.string().min(1).refine(v => v !== "XX", "must not be template placeholder")`
- `site.geo.lat` + `site.geo.lng` — `z.number().refine(n => n !== 0, "must be real coordinates")`
- `site.contact.email` — `z.string().email()`
- `site.contact.phone` — `z.string().min(1)`
- `site.contact.address` (all 5 fields: `street`, `city`, `region`, `postalCode`, `country`) — `z.string().min(1)` each
- `site.hours` — `z.array(...).min(1)` (non-empty hoursSpec blocks)
- `location.geo.lat` + `location.geo.lng` — `z.number().refine(n => n !== 0, ...)`
- `location.hours` — `z.array(...).min(1)`
- `location.hoursSpec` — `z.array(...).min(1)`
- Per-service `price` and `priceTo` — `z.number().positive()` (both > 0; priceTo >= price handled by `.refine()`)

**Required-if-exists (D-07 Maps CID):**
- `site.socialProfiles`: if any entry matches `/google\.com\/maps/`, it must contain a numeric CID (`/cid=\d+/`). An empty array is allowed (no GBP yet = deferred-OK per D-07).
- Implementation: `z.array(z.string()).refine(profiles => profiles.filter(p => p.includes('google.com/maps')).every(p => /cid=\d+/.test(p)), "Google Maps entry must contain a real CID")`

**Deferred-OK (D-08 gift certificate):**
- `site.booker.giftCertificate` — NOT validated. No required-core check.

### Concrete validator sketch

**File location proposal:** `src/config/config-completeness.ts`

This is a pure function module — no side effects, no env resolution, no Next.js imports. It can be imported by both the bun:test and the next.config.ts hook.

```typescript
// src/config/config-completeness.ts
import z from "zod";
import { TENANT_REGISTRY } from "./index";

// Tenants excluded from the completeness bar (clone source, not a real deployment).
const EXCLUDED_TENANTS = new Set(["template"]);

const GeoSchema = z.object({
  lat: z.number().refine((n) => n !== 0, "must be real coordinates (not 0)"),
  lng: z.number().refine((n) => n !== 0, "must be real coordinates (not 0)"),
});

const ServiceSchema = z.object({
  id: z.string().min(1),
  price: z.number().positive("price must be > 0"),
  priceTo: z.number().positive("priceTo must be > 0"),
});

const AddressSchema = z.object({
  street: z.string().min(1, "street required"),
  city: z.string().min(1, "city required"),
  region: z.string().min(1, "region required"),
  postalCode: z.string().min(1, "postalCode required"),
  country: z.string().min(1, "country required"),
});

const TenantCoreSchema = z.object({
  site: z.object({
    name: z.string().min(1, "name required"),
    url: z.string().url("url must be a valid URL"),
    storeId: z
      .string()
      .min(1, "storeId required")
      .refine((v) => v !== "XX", 'storeId must not be template placeholder "XX"'),
    geo: GeoSchema,
    hours: z.array(z.any()).min(1, "hours must be non-empty"),
    contact: z.object({
      email: z.string().email("contact.email must be a valid email"),
      phone: z.string().min(1, "contact.phone required"),
      address: AddressSchema,
    }),
    socialProfiles: z.array(z.string()).refine(
      (profiles) =>
        profiles
          .filter((p) => p.includes("google.com/maps"))
          .every((p) => /cid=\d+/.test(p)),
      "Google Maps socialProfile must contain a real CID (cid=<digits>)"
    ),
  }),
  location: z.object({
    geo: GeoSchema,
    hours: z.array(z.any()).min(1, "location.hours must be non-empty"),
    hoursSpec: z.array(z.any()).min(1, "location.hoursSpec must be non-empty"),
  }),
  services: z.array(ServiceSchema).min(1, "services must be non-empty"),
});

export type ConfigCompletenessError = {
  tenantId: string;
  errors: string[];
};

/**
 * Pure function. Validates all non-excluded tenants in TENANT_REGISTRY against
 * the required-core bar (D-06/D-07/D-08). Returns an array of per-tenant errors.
 * Empty array = all tenants pass.
 */
export function validateAllTenants(): ConfigCompletenessError[] {
  const failures: ConfigCompletenessError[] = [];

  for (const [id, config] of Object.entries(TENANT_REGISTRY)) {
    if (EXCLUDED_TENANTS.has(id)) continue;

    const result = TenantCoreSchema.safeParse(config);
    if (!result.success) {
      const errors = result.error.issues.map(
        (issue) => `  [${issue.path.join(".")}] ${issue.message}`
      );
      failures.push({ tenantId: id, errors });
    }
  }

  return failures;
}

/**
 * Throws with a formatted message if any tenant fails the completeness check.
 * Designed to be called from a prebuild script or next.config.ts.
 */
export function assertAllTenantsComplete(): void {
  const failures = validateAllTenants();
  if (failures.length === 0) return;

  const message = failures
    .map(
      ({ tenantId, errors }) =>
        `Tenant "${tenantId}" has incomplete required-core config:\n${errors.join("\n")}`
    )
    .join("\n\n");

  throw new Error(
    `\n\nConfig completeness check FAILED — fix before deploying:\n\n${message}\n`
  );
}
```

---

## Recommendation: Build Guard

### Chosen wiring: `prebuild` npm script (primary) + `next.config.ts` hook (secondary)

**Use both.** They serve different audiences:

| Guard | Who benefits | When it runs |
|-------|-------------|--------------|
| `prebuild` npm script | Dokploy Docker build (`npm run build`) | Before `next build` starts, fast fail |
| `next.config.ts` hook | Any invocation of `next build` directly (bypassing npm scripts) | During config load, before compilation |
| bun:test | Local dev fast feedback | `bun test src/` |

**Why `prebuild` is the primary guard:** The Dockerfile explicitly runs `npm run build` [VERIFIED: `Dockerfile` line 17]. npm unconditionally runs `prebuild` before `build` — this is standard npm lifecycle behavior since npm 2.x, confirmed for npm 11.12.1. If `prebuild` exits non-zero, `npm run build` never starts. This is the clearest, earliest abort point.

**Why also `next.config.ts`:** Defense in depth. A developer running `npx next build` directly (bypassing npm scripts) would still be caught. The `next.config.ts` hook does not duplicate code — it calls the same `assertAllTenantsComplete()` from `src/config/config-completeness.ts`.

**Why NOT `next.config.ts` as the sole guard:** The config function runs during both `next build` and `next dev`. Without phase-gating, it blocks `next dev` when configs are intentionally incomplete during the fill-in phase. Gating on `PHASE_PRODUCTION_BUILD` fixes this but adds complexity. The `prebuild` script is simpler and more obvious.

### prebuild script sketch

**Add to `package.json`:**
```json
"scripts": {
  "prebuild": "node --import ./scripts/ts-register.mjs ./scripts/validate-config.mjs",
  "build": "next build",
  ...
}
```

**Problem:** The Docker build stage uses Node 20, which does NOT support `--experimental-strip-types` (that requires Node 22.6+). [VERIFIED: local node is v26 which supports it; Docker is node:20-alpine which does not.]

**Solution A (recommended): Pure JS prebuild script.** The validator is written in `src/config/config-completeness.ts` (TypeScript for the shared module), but the prebuild *entry point* is a plain `.mjs` that bundles just the check inline in JavaScript — no TypeScript needed at the script entry level. The config data files themselves (`services.ts`, `site.ts`, etc.) are TypeScript — importing them from a plain `.mjs` also won't work in Node 20.

**Solution B (recommended, simpler): Use `next.config.ts` as the ONLY build guard.** Since Next.js registers SWC-based require hooks that transpile `.ts` files before loading the config [VERIFIED: `node_modules/next/dist/build/next-config-ts/require-hook.js`], `next.config.ts` CAN import from `./src/config/index.ts` and all transitive `.ts` imports will be transpiled by SWC. Gate with `PHASE_PRODUCTION_BUILD` to avoid blocking `next dev`. The `prebuild` script can be a simpler wrapper that just calls `node -e "require('...')"` on the compiled output — but this adds complexity.

**Revised recommendation:** Use `next.config.ts` as the sole build guard (simplest, most reliable in this stack), and the bun:test as the local guard. Drop the `prebuild` script.

### next.config.ts build guard sketch

```typescript
// next.config.ts
import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const securityHeaders = [ /* ... existing ... */ ];

export default async function config(phase: string): Promise<NextConfig> {
  if (phase === PHASE_PRODUCTION_BUILD) {
    // Import here (inside the function) to avoid running at `next dev` startup
    // when configs may be legitimately incomplete.
    // Next.js SWC require-hooks transpile this .ts import at build time.
    const { assertAllTenantsComplete } = await import(
      "./src/config/config-completeness"
    );
    assertAllTenantsComplete(); // throws -> next build exits 1 via printAndExit
  }

  return {
    output: "standalone",
    poweredByHeader: false,
    turbopack: { root: __dirname },
    images: { remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }] },
    async headers() {
      return [{ source: "/:path*", headers: securityHeaders }];
    },
  };
}
```

**Why `await import()` inside the function body:** Avoids any module-level side effects at `next dev` startup. The import is only resolved when `PHASE_PRODUCTION_BUILD` is active.

**Exit behavior confirmation:** `assertAllTenantsComplete()` throws → propagates through `normalizeConfig()` (no catch) → caught by `next-build.js` `.catch()` → `printAndExit(err)` → `process.exit(1)`. [VERIFIED: source chain above]

### bun:test sketch

**File:** `src/config/config-completeness.test.ts`

```typescript
// src/config/config-completeness.test.ts
import { test, expect } from "bun:test";
import { validateAllTenants } from "./config-completeness";

test("all non-template tenants pass required-core completeness", () => {
  // After user fills in the checklist values, this must be empty.
  const failures = validateAllTenants();
  expect(failures).toEqual([]);
});

test("template tenant is excluded from completeness check", () => {
  // Template has placeholder values (storeId: "XX", geo: 0/0) — it must be skipped.
  const failures = validateAllTenants();
  const templateFailure = failures.find((f) => f.tenantId === "template");
  expect(templateFailure).toBeUndefined();
});
```

**Import safety:** `validateAllTenants()` imports `TENANT_REGISTRY` from `./index`, which calls `resolveTenant(process.env.TENANT)` at module load. In test context `process.env.TENANT` is undefined → defaults to `ongles-maily` (same as existing `resolve-tenant.test.ts` does). This is safe — the import works, and `TENANT_REGISTRY` is a static object. [VERIFIED: `src/config/resolve-tenant.test.ts` imports from `./index` the same way]

---

## Pitfalls

### Pitfall 1: Importing `TENANT_REGISTRY` from `src/config/index` triggers env resolution at module load

**What goes wrong:** `src/config/index.ts` line 35: `export const tenant = resolveTenant(process.env.TENANT)`. Importing from `./index` runs this at module load time in both tests and the build guard.

**Why it matters:** In tests, `TENANT` is undefined → defaults to `ongles-maily` (safe). In the build guard (next.config.ts), it runs when Next.js processes the config — `TENANT` may or may not be set at that point, but the default fallback is fine since we only need `TENANT_REGISTRY`, not `tenant`.

**How to avoid:** The `validateAllTenants()` function only uses `TENANT_REGISTRY` (the exported object containing all tenants), not the `tenant`, `site`, `locations`, or `services` named exports. This is the correct usage. Do NOT import `site` or `locations` in the validator — those are the runtime-resolved single-tenant exports that are tied to `process.env.TENANT`.

### Pitfall 2: `geo: { lat: 0, lng: 0 }` is a valid TypeScript value but an invalid real coordinate

**What goes wrong:** TypeScript type `{ lat: number; lng: number }` does not distinguish between the template placeholder (0, 0) and a real coordinate. The type system gives no error.

**How to avoid:** The zod `.refine(n => n !== 0)` check is the only guard. Explicitly test in bun:test that a tenant with `lat: 0` fails the validator.

### Pitfall 3: `storeId` type-checks as any non-empty string

**What goes wrong:** `storeId: "OC"` and `storeId: "XX"` are both valid `string`. The template's `"XX"` placeholder passes TypeScript but should fail the validator for real tenants.

**How to avoid:** Add `.refine(v => v !== "XX", ...)` to the storeId schema. The real storeIds (`"OM"`, real values for Charlesbourg/Rivières) must come from the user checklist.

### Pitfall 4: `next.config.ts` runs during `next dev` — validator blocks dev with incomplete configs

**What goes wrong:** If `assertAllTenantsComplete()` is called unconditionally in the config function, `next dev` fails as soon as configs have any incomplete field (which they will during the fill-in work itself).

**How to avoid:** Gate the validator call with `phase === PHASE_PRODUCTION_BUILD`. Import `PHASE_PRODUCTION_BUILD` from `"next/constants"` [VERIFIED: available in this Next.js version via `node_modules/next/dist/shared/lib/constants.js`].

### Pitfall 5: The `prebuild` npm script won't run TypeScript config imports under Node 20

**What goes wrong:** A `prebuild` script like `node scripts/validate-config.ts` fails under Node 20 (Docker's build stage) because Node 20 does not support `--experimental-strip-types`. The project has no `tsx`, `ts-node`, or `esno` installed. [VERIFIED: `ls node_modules/.bin/tsx` → not found]

**How to avoid:** This is why the `next.config.ts` hook is recommended over a `prebuild` script for this project. The Next.js SWC require-hooks enable TypeScript imports from within `next.config.ts`, making it the correct execution context for a validator that imports `src/config/*.ts` files.

### Pitfall 6: `socialProfiles` is `readonly string[]` — spreading needed for zod

**What goes wrong:** `TenantSite.socialProfiles` is `readonly string[]`. Zod `z.array(z.string())` works fine on readonly arrays at runtime (readonly is TypeScript-only), but if you try to `.filter()` or iterate it in a refine callback, it works — no issue. The `as const` on the site objects also makes the array readonly, but zod's `.refine()` receives the plain value at runtime.

**How to avoid:** No special handling needed. Zod's `.refine()` receives the runtime value, and readonly is erased at runtime.

### Pitfall 7: `site.hours` on `TenantSite` uses schema.org format; `location.hours` uses display format

**What goes wrong:** `TenantSite.hours` is `readonly { days: readonly string[]; opens: string; closes: string }[]` (schema.org blocks). `Location.hours` is `DayHours[]` = `{ label: string; value: string }[]`. They are different shapes. The validator must check both separately.

**How to avoid:** Use `z.array(z.any()).min(1)` for both — the validator only cares that they are non-empty (the shapes are already correct per TypeScript). For stricter checking, validate `z.object({ days: z.array(z.string()), opens: z.string(), closes: z.string() })` for `site.hours` and `z.object({ label: z.string(), value: z.string() })` for `location.hours`.

### Pitfall 8: `site.contact.email` may have placeholder values that pass `.email()` validation

**What goes wrong:** The incomplete tenants already have `email: "info@onglescharlesbourg.com"` and `email: "info@onglesrivieres.com"` — these pass `z.string().email()`. The TODO says "confirm public contact email" — it's unclear if these are real or placeholder.

**What this means for the validator:** `z.string().email()` can't distinguish a guessed address from a confirmed one. The validator can only check format. The human data checklist (D-02) is the confirmation gate, not the validator. This is by design — the validator guards against empty/undefined, not against unconfirmed-but-valid-looking values.

---

## Open Questions for Planner

1. **`next.config.ts` async-function refactor scope:** The current `next.config.ts` exports a plain object (`export default nextConfig`). Converting it to `export default async function config(phase)` changes the export shape. The planner should verify no other tooling (e.g., `eslint-config-next`, Turbopack config) depends on the object form. [ASSUMED low risk — Next.js documents both forms as equivalent]

2. **`template` exclusion is hardcoded in the validator:** `EXCLUDED_TENANTS = new Set(["template"])`. If a new tenant is added to `TENANT_REGISTRY` before its config is complete, it will fail the build guard. Is this the desired behavior, or should there be a per-tenant `draft: true` flag? D-03 says "template is excluded" but is silent on future tenants. Decision for planner/user.

3. **`widgetHost` for Charlesbourg/Rivières:** Both use `widgetHost: "https://app.onglesmaily.com"` (the maily widget host). This may be a placeholder too — the SalonX widget host may differ per tenant. Not flagged as a TODO in the codebase. Is this intentional? The validator does not check `widgetHost` per the D-06 bar, but the planner may want to add it to the data checklist.

4. **Service `priceTo >= price` constraint:** The validator checks both `price > 0` and `priceTo > 0` but does not check `priceTo >= price`. Should a `refine` enforce this? Low priority — the existing maily services all satisfy it, and it's an easy checklist-time check. Worth adding to the validator for correctness.

---

## Sources

| Claim | Source | Confidence |
|-------|--------|------------|
| Next.js version 16.2.6 | `package.json` | VERIFIED |
| Zod version 4.4.3 | `node -e require(zod/package.json).version` | VERIFIED |
| SWC require-hooks transpile `.ts` imports | `node_modules/next/dist/build/next-config-ts/require-hook.js` | VERIFIED |
| `normalizeConfig` calls config function with no try/catch | `node_modules/next/dist/server/config-shared.js` line 271 | VERIFIED |
| `printAndExit` defaults to exit code 1 | `node_modules/next/dist/server/lib/utils.js` line 69 | VERIFIED |
| `PHASE_PRODUCTION_BUILD = 'phase-production-build'` | `node_modules/next/dist/shared/lib/constants.js` | VERIFIED |
| Dockerfile uses `npm run build` in node:20-alpine | `Dockerfile` line 9, 17 | VERIFIED |
| No `tsx`/`ts-node` in devDependencies | `package.json` + `ls node_modules/.bin/tsx` | VERIFIED |
| Zod v4.4.3 `z.string().min(1)` and `.refine()` work as expected | `node -e` runtime test | VERIFIED |
| `TENANT_REGISTRY` import triggers `resolveTenant(process.env.TENANT)` | `src/config/index.ts` line 35 | VERIFIED |
| Template storeId "XX", geo {lat:0,lng:0} | `src/config/tenants/template/site.ts` | VERIFIED |
| Existing tests import from `./index` safely (TENANT undefined → default maily) | `src/config/resolve-tenant.test.ts` | VERIFIED |
| `bun test src/` is the test command | `package.json` scripts | VERIFIED |
| All TODO fields per tenant | grep of charlesbourg/ and rivieres/ | VERIFIED |
