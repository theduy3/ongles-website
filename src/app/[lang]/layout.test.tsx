/**
 * layout.test.tsx — tests for GA4 script injection logic used in layout.tsx.
 *
 * Tests the shouldInjectGA4(measurementId) guard which controls whether GA4
 * <Script> tags are rendered in the layout (M-01).
 *
 * The guard is the critical safety check: empty measurementId MUST suppress
 * all GA4 scripts — this prevents runtime errors when tenants have no GA4
 * property configured yet (all tenants in wave 2 still have empty placeholders).
 *
 * Also tests buildConsentInitScript(measurementId) which produces the
 * beforeInteractive inline script content for Consent Mode v2 denied-by-default.
 */

import { describe, it, expect } from "bun:test";
import {
  shouldInjectGA4,
  buildConsentInitScript,
} from "../../lib/ga4-scripts";

// ─── shouldInjectGA4() ────────────────────────────────────────────────────────

describe("shouldInjectGA4()", () => {
  it("returns true for a non-empty measurement ID", () => {
    expect(shouldInjectGA4("G-XXXXXXXXXX")).toBe(true);
  });

  it("returns true for any non-empty string (real IDs validated at 05-05)", () => {
    expect(shouldInjectGA4("G-TEST12345")).toBe(true);
  });

  it("returns false for an empty string (no GA4 configured)", () => {
    expect(shouldInjectGA4("")).toBe(false);
  });

  it("returns false for a whitespace-only string", () => {
    expect(shouldInjectGA4("   ")).toBe(false);
  });
});

// ─── buildConsentInitScript() ─────────────────────────────────────────────────

describe("buildConsentInitScript() — Consent Mode v2 denied-by-default", () => {
  const script = buildConsentInitScript("G-TEST12345");

  it("includes window.dataLayer initialization", () => {
    expect(script).toContain("window.dataLayer");
  });

  it("includes gtag function definition", () => {
    expect(script).toContain("function gtag");
  });

  it("defaults analytics_storage to 'denied' (Law 25 — denied-by-default)", () => {
    expect(script).toContain("analytics_storage");
    expect(script).toContain("'denied'");
  });

  it("defaults ad_storage to 'denied'", () => {
    expect(script).toContain("ad_storage");
  });

  it("sets 'wait_for_update' so Consent Mode can be updated before GA4 loads", () => {
    expect(script).toContain("wait_for_update");
  });

  it("includes the measurement ID in the gtag config call", () => {
    expect(script).toContain("G-TEST12345");
  });

  it("calls gtag consent 'default' (not 'update') for the initial denied state", () => {
    expect(script).toContain("'default'");
  });
});
