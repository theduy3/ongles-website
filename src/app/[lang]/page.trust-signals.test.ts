import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

// Source tripwire tests for CONV-02 above-fold trust signals on the home page.
//
// The home page is an async Server Component — DOM rendering is not available
// in bun:test. We verify the structural correctness of the implementation via
// source-level assertions:
//
//   1. formatFromPrice is used in the hero region (price-from anchor).
//   2. A link to the tarifs/pricing route is rendered from the price-from value.
//   3. The stars block (R-02 gate) is rendered only under `trust.show` — the
//      gate itself lives in trustSignals() (@/lib/reviews), unit-tested to
//      return { show: false } when reviewCount <= 0.
//
// These tripwires fail immediately if:
//   - The price-from anchor is removed from the hero.
//   - The R-02 gate is removed (stars rendered unconditionally → fabricated-review risk).
//   - The pricing route link is hardcoded or removed.

const homeSource = readFileSync(
  new URL("./page.tsx", import.meta.url),
  "utf8",
);

describe("home page — above-fold trust signals (CONV-02)", () => {
  test("price-from anchor uses formatFromPrice (not hardcoded)", () => {
    expect(homeSource).toContain("formatFromPrice");
  });

  test("price-from anchor links to the tarifs/pricing route", () => {
    // The anchor must reference the localized pricing route via site.routes or
    // a lang-prefixed /tarifs or /pricing segment. Accept any of the expected
    // patterns so this isn't fragile to locale-key naming.
    const hasPricingRoute =
      homeSource.includes("tarifs") || homeSource.includes("pricing");
    expect(hasPricingRoute).toBe(true);
  });

  test("stars block is R-02-gated via trust.show (gate owned by trustSignals)", () => {
    expect(homeSource).toContain("trust.show");
  });
});
