/**
 * ConsentBanner.test.tsx — bun:test for ConsentBanner logic.
 *
 * The ConsentBanner is a 'use client' island with no DOM-testable render output
 * in bun:test. We test the exported pure helpers directly:
 *
 *   - getStoredConsent(storage) → 'accepted' | 'declined' | null
 *   - buildConsentUpdate(accepted) → gtag consent update params
 *
 * And verify that the CONSENT_KEY constant is the expected localStorage key.
 *
 * M-02 / Law 25 (Québec): analytics_storage defaults to 'denied'. On accept,
 * analytics_storage is set to 'granted'; ad_storage stays 'denied' always.
 */

import { describe, it, expect } from "bun:test";

// Import the exported helpers and constant from the component.
import {
  CONSENT_KEY,
  getStoredConsent,
  buildConsentUpdate,
} from "./ConsentBanner";

// ─── CONSENT_KEY ─────────────────────────────────────────────────────────────

describe("CONSENT_KEY", () => {
  it("is the string 'ga4_consent'", () => {
    expect(CONSENT_KEY).toBe("ga4_consent");
  });
});

// ─── getStoredConsent() ───────────────────────────────────────────────────────

describe("getStoredConsent()", () => {
  it("returns 'accepted' when storage has CONSENT_KEY = 'accepted'", () => {
    const mockStorage = { getItem: (key: string) => (key === CONSENT_KEY ? "accepted" : null) };
    expect(getStoredConsent(mockStorage as Storage)).toBe("accepted");
  });

  it("returns 'declined' when storage has CONSENT_KEY = 'declined'", () => {
    const mockStorage = { getItem: (key: string) => (key === CONSENT_KEY ? "declined" : null) };
    expect(getStoredConsent(mockStorage as Storage)).toBe("declined");
  });

  it("returns null when CONSENT_KEY is not set", () => {
    const mockStorage = { getItem: (_key: string) => null };
    expect(getStoredConsent(mockStorage as Storage)).toBeNull();
  });

  it("returns null for unexpected stored values (unknown state)", () => {
    const mockStorage = { getItem: (_key: string) => "unknown_value" };
    expect(getStoredConsent(mockStorage as Storage)).toBeNull();
  });
});

// ─── buildConsentUpdate() ─────────────────────────────────────────────────────

describe("buildConsentUpdate() on accept", () => {
  it("sets analytics_storage to 'granted' when accepted=true", () => {
    const params = buildConsentUpdate(true);
    expect(params.analytics_storage).toBe("granted");
  });

  it("sets ad_storage to 'denied' even when accepted=true (Law 25 — no ad tracking)", () => {
    const params = buildConsentUpdate(true);
    expect(params.ad_storage).toBe("denied");
  });
});

describe("buildConsentUpdate() on decline", () => {
  it("sets analytics_storage to 'denied' when accepted=false", () => {
    const params = buildConsentUpdate(false);
    expect(params.analytics_storage).toBe("denied");
  });

  it("sets ad_storage to 'denied' when accepted=false", () => {
    const params = buildConsentUpdate(false);
    expect(params.ad_storage).toBe("denied");
  });
});

describe("buildConsentUpdate() Law 25 invariant", () => {
  it("ad_storage is ALWAYS 'denied' regardless of accept/decline", () => {
    expect(buildConsentUpdate(true).ad_storage).toBe("denied");
    expect(buildConsentUpdate(false).ad_storage).toBe("denied");
  });
});
