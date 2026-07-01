import { describe, expect, it, spyOn } from "bun:test";
import {
  readStoreSettings,
  getStoreSettings,
  upsertStoreSettings,
  resolvePublicRead,
  resolveAdminRead,
} from "@/lib/store-settings-store";

// These tests run WITHOUT Supabase configured (no env vars in test env).
// The contract: every function degrades gracefully rather than throwing.

describe("store-settings-store (no Supabase configured)", () => {
  it("readStoreSettings resolves null when Supabase is not configured", async () => {
    // WHY: The public read is used at request time to load overrides; when
    // Supabase is absent (local dev, CI, static build) it must return null so
    // the caller falls through to the static config without crashing.
    const result = await readStoreSettings();
    expect(result).toBeNull();
  });

  it("getStoreSettings resolves not_configured when Supabase is absent", async () => {
    // WHY: Admin reads go through StoreResult so the API route can distinguish
    // "not configured" (expected in local dev) from "query failed" (a real
    // error that should be surfaced to the operator).
    const result = await getStoreSettings();
    expect(result).toEqual({ ok: false, reason: "not_configured" });
  });

  it("upsertStoreSettings resolves not_configured when Supabase is absent", async () => {
    // WHY: Admin writes must never throw — the API route converts the result to
    // an HTTP response. When the admin client is null, return not_configured so
    // the route can respond 503 with a clear message.
    const result = await upsertStoreSettings({});
    expect(result).toEqual({ ok: false, reason: "not_configured" });
  });
});

// The pure response→value decision. Fed the ALREADY-FETCHED Supabase response as
// plain data — the degrade path is reachable through the seam, no client.
describe("resolvePublicRead (public read: silent degrade)", () => {
  it("degrades to null on a query error", () => {
    expect(resolvePublicRead({ data: null, error: { message: "boom" } }, "t")).toBeNull();
  });

  it("degrades to null when no row exists", () => {
    expect(resolvePublicRead({ data: null, error: null }, "t")).toBeNull();
  });

  it("degrades to null on a corrupt stored doc (silent — caller falls to static)", () => {
    const spy = spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(resolvePublicRead({ data: { doc: { reviews: 123 } }, error: null }, "t")).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });

  it("returns the parsed settings for a valid doc", () => {
    expect(resolvePublicRead({ data: { doc: {} }, error: null }, "t")).toEqual({});
  });
});

describe("resolveAdminRead (admin read: loud on corruption)", () => {
  it("surfaces a query error as failed with the error message", () => {
    expect(resolveAdminRead({ data: null, error: { message: "boom" } }, "t")).toEqual({
      ok: false,
      reason: "failed",
      detail: "boom",
    });
  });

  it("returns ok(null) when no row exists yet (fresh tenant)", () => {
    expect(resolveAdminRead({ data: null, error: null }, "t")).toEqual({ ok: true, data: null });
  });

  it("surfaces a corrupt stored doc as failed so the operator sees it", () => {
    const spy = spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(resolveAdminRead({ data: { doc: { reviews: 123 } }, error: null }, "t")).toEqual({
        ok: false,
        reason: "failed",
        detail: "stored doc failed schema validation",
      });
    } finally {
      spy.mockRestore();
    }
  });

  it("returns ok(settings) for a valid doc", () => {
    expect(resolveAdminRead({ data: { doc: {} }, error: null }, "t")).toEqual({ ok: true, data: {} });
  });
});
