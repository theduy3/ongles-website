import { describe, expect, it, mock } from "bun:test";

// getSeo lives in seo-content.ts which has `import "server-only"` + Next.js/React
// cache imports. Mock those BEFORE the dynamic import (same approach as
// dictionaries.test.ts) so the module loads and the DB fallback path runs.
mock.module("server-only", () => ({}));
mock.module("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

const { getSeo } = await import("@/app/[lang]/seo-content");

// The base -> tenant -> db precedence, deep-merge, and non-mutation behavior
// formerly unit-tested here via composeSeo (compose-seo.ts) is now provided by
// the shared composeLayers() in layered-locale-content.ts and is covered by
// layered-locale-content.test.ts's "composeLayers (base -> tenant -> db
// precedence)" suite. composeSeo/compose-seo.ts was deleted as part of the
// layeredLocaleContent rewrite (Task 4).

describe("getSeo (integration — no DB in test env)", () => {
  it("returns the full SEO shape for fr", async () => {
    const seo = await getSeo("fr");
    expect(seo.meta).toBeDefined();
    expect(seo.services).toBeDefined();
    expect(seo.org).toBeDefined();
    expect(seo.gallery).toBeDefined();
  });

  it("returns the full SEO shape for en", async () => {
    const seo = await getSeo("en");
    expect(seo.meta.homeTitle).toBeDefined();
    expect(seo.services["pose-ongles"].metaTitle).toBeDefined();
  });

  it("fr and en are independent objects", async () => {
    const fr = await getSeo("fr");
    const en = await getSeo("en");
    expect(fr).not.toBe(en);
  });
});
