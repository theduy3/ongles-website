// config-completeness.test.ts
// TDD RED: This test suite is intentionally failing until Plan 01-2 fills real
// per-tenant data for ongles-charlesbourg and ongles-rivieres. Test 1 stays RED
// until both tenants have confirmed required-core values (D-06/D-07). Tests 2 & 3
// must PASS once the validator module exists (they verify the guard machinery itself).

import { test, expect } from "bun:test";
import { validateAllTenants, validateConfig } from "./config-completeness";

// ─── Test 1: all non-template tenants must pass required-core (GREEN after 01-2) ──
//
// This is the phase-completion gate. It goes GREEN only when Plan 01-2 fills real
// confirmed values for every field in D-06 for both Charlesbourg and Rivières.
// Until then it is correctly RED — the validator reports missing/placeholder fields.
test("all non-template tenants pass required-core completeness", () => {
  const failures = validateAllTenants();
  expect(failures).toEqual([]);
});

// ─── Test 2: template tenant is excluded from the completeness bar (D-03) ─────────
//
// The template/ tenant exists as the clone source for new salons; it holds obvious
// placeholder values (storeId "XX", geo 0/0). It must NEVER appear in failures.
test("template tenant is excluded from completeness check", () => {
  const failures = validateAllTenants();
  const templateFailure = failures.find((f) => f.tenantId === "template");
  expect(templateFailure).toBeUndefined();
});

// ─── Test 3: negative guard — placeholder values are actually rejected ─────────────
//
// Covers RESEARCH Pitfalls 2 & 3: TypeScript alone cannot distinguish
// geo {lat:0,lng:0} or storeId "XX" from real values; the zod refine()
// must catch them. This test passes a synthetic minimal config directly
// to validateConfig() so it does NOT mutate TENANT_REGISTRY.
test("validator rejects placeholder geo and storeId in a synthetic config", () => {
  const placeholderConfig = {
    site: {
      name: "Test Salon",
      url: "https://example.com",
      storeId: "XX", // template placeholder — must be rejected
      geo: { lat: 0, lng: 0 }, // template placeholder — must be rejected
      hours: [{ days: ["Mo"], opens: "09:00", closes: "17:00" }],
      contact: {
        email: "test@example.com",
        phone: "(000) 000-0000",
        address: {
          street: "123 Street",
          city: "City",
          region: "QC",
          postalCode: "A1A 1A1",
          country: "CA",
        },
      },
      socialProfiles: [],
    },
    location: {
      geo: { lat: 0, lng: 0 }, // placeholder — must be rejected
      hours: [{ label: "Lun", value: "9h–17h" }],
      hoursSpec: [{ days: ["Mo"], opens: "09:00", closes: "17:00" }],
    },
    services: [
      { id: "pose-ongles", price: 60, priceTo: 75 },
    ],
  };

  const result = validateConfig(placeholderConfig);
  // Must have errors because storeId="XX" and both geo fields are 0,0
  expect(result.success).toBe(false);
  if (!result.success) {
    const paths = result.errors.map((e) => e.split("]")[0].replace("[", ""));
    // storeId "XX" must be caught
    expect(paths.some((p) => p.includes("storeId"))).toBe(true);
    // At least one geo.lat or geo.lng must be caught
    expect(paths.some((p) => p.includes("geo"))).toBe(true);
  }
});
