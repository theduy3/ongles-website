import { describe, expect, it } from "bun:test";
import {
  readStoreSettings,
  getStoreSettings,
  upsertStoreSettings,
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
