import { describe, expect, it, mock } from "bun:test";

// composeSeo lives in compose-seo.ts — no server-only, no Next.js deps — so it
// imports cleanly in bun:test without mocking.
import { composeSeo } from "@/app/[lang]/compose-seo";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyContent = Record<string, any>;
const compose = (b: object, t: object, d: object) =>
  composeSeo(b as AnyContent, t as AnyContent, d as AnyContent) as AnyContent;

// getSeo lives in seo-content.ts which has `import "server-only"` + Next.js/React
// cache imports. Mock those BEFORE the dynamic import (same approach as
// dictionaries.test.ts) so the module loads and the DB fallback path runs.
mock.module("server-only", () => ({}));
mock.module("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));
mock.module("react", () => ({
  cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

const { getSeo } = await import("@/app/[lang]/seo-content");

describe("composeSeo (pure unit)", () => {
  it("dbOverride > tenantOverride > base precedence", () => {
    const base = { meta: { homeTitle: "Base", homeDescription: "Base Desc" } };
    const tenant = { meta: { homeTitle: "Tenant" } };
    const db = { meta: { homeTitle: "DB" } };

    const result = compose(base, tenant, db);

    expect(result.meta.homeTitle).toBe("DB");
    expect(result.meta.homeDescription).toBe("Base Desc");
  });

  it("tenant wins over base when db has no key", () => {
    const base = { meta: { homeTitle: "Base", homeDescription: "Base Desc" } };
    const tenant = { meta: { homeDescription: "Tenant Desc" } };

    const result = compose(base, tenant, {});

    expect(result.meta.homeDescription).toBe("Tenant Desc");
    expect(result.meta.homeTitle).toBe("Base");
  });

  it("empty dbOverride leaves base+tenant merge intact", () => {
    const base = { meta: { homeTitle: "Base" }, org: { description: "Org" } };
    const tenant = { meta: { homeTitle: "Tenant" } };

    const result = compose(base, tenant, {});

    expect(result.meta.homeTitle).toBe("Tenant");
    expect(result.org.description).toBe("Org");
  });

  it("deep merges nested service keys without clobbering siblings", () => {
    const base = {
      services: { "pose-ongles": { metaTitle: "Base", heroAlt: "Base Alt" } },
    };
    const tenant = {};
    const db = { services: { "pose-ongles": { metaTitle: "DB" } } };

    const result = compose(base, tenant, db);

    expect(result.services["pose-ongles"].metaTitle).toBe("DB");
    expect(result.services["pose-ongles"].heroAlt).toBe("Base Alt");
  });

  it("does not mutate base", () => {
    const base = { meta: { homeTitle: "Original" } };
    compose(base, { meta: { homeTitle: "Override" } }, {});
    expect(base.meta.homeTitle).toBe("Original");
  });
});

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
