import { describe, expect, it } from "bun:test";
import {
  STORE_CACHE_NAMESPACES,
  storeCacheTag,
  storeCacheTags,
} from "@/lib/cache-tags";

// Single owner of the per-tenant cache tag names. Registration (cachedTenantResource
// tags) and invalidation (revalidateStoreCaches, in the admin write path) both derive
// from here, so the two sides can't drift — a mismatch would silently serve stale
// config with no error.
describe("storeCacheTag", () => {
  it("builds a namespaced, tenant-scoped tag", () => {
    expect(storeCacheTag("store-config", "ongles-maily")).toBe(
      "store-config:ongles-maily",
    );
    expect(storeCacheTag("store-seo", "t1")).toBe("store-seo:t1");
  });
});

describe("storeCacheTags", () => {
  it("returns exactly one tag per namespace (locks format AND set membership)", () => {
    // If a namespace is added, renamed, or the format changes, this fails —
    // forcing the revalidate side to stay in lockstep with registration.
    expect(storeCacheTags("ongles-maily")).toEqual([
      "store-config:ongles-maily",
      "store-content:ongles-maily",
      "store-seo:ongles-maily",
    ]);
  });

  it("covers every declared namespace", () => {
    expect(storeCacheTags("t1").length).toBe(STORE_CACHE_NAMESPACES.length);
  });
});
