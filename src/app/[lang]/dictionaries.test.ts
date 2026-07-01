import { describe, expect, it, mock } from "bun:test";

// composeLayers lives in layered-locale-content.ts — no server-only, no Next.js
// deps — so it imports cleanly in bun:test without any mocking needed.
import { composeLayers } from "@/app/[lang]/layered-locale-content";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyContent = Record<string, any>;
const compose = (b: object, t: object, d: object) =>
  composeLayers(b as AnyContent, t as AnyContent, d as AnyContent) as AnyContent;

// getDictionary lives in dictionaries.ts which has `import "server-only"` and
// Next.js/React cache imports. Mock those modules BEFORE the dynamic import so
// bun's module resolver doesn't throw on them.
// WHY: server-only throws at import outside Next.js runtime; unstable_cache and
// React cache are no-ops in test env — we stub them to identity functions so the
// module loads and the DB fallback path (try/catch) runs the uncached resolver.
mock.module("server-only", () => ({}));
mock.module("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));
mock.module("react", () => ({
  cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

// Dynamic import AFTER mocks are registered.
const { getDictionary } = await import("@/app/[lang]/dictionaries");

// WHY: composeDictionary is the pure 3-layer merge function. Testing it in
// isolation verifies precedence rules without needing a DB or Next.js runtime.
describe("composeLayers (pure unit)", () => {
  it("dbOverride wins over tenantOverride wins over base (precedence chain)", () => {
    // WHY: DB content is the authoritative final layer — an operator edit must
    // always beat both the base and the static tenant override.
    const base = { meta: { title: "Base Title", description: "Base Desc" } };
    const tenant = { meta: { title: "Tenant Title" } };
    const db = { meta: { title: "DB Title" } };

    const result = compose(base, tenant, db);

    expect(result.meta.title).toBe("DB Title");
    expect(result.meta.description).toBe("Base Desc"); // base inherited when neither overrides
  });

  it("tenantOverride wins over base when no dbOverride for that key", () => {
    // WHY: The static tenant file is the second-priority layer. Keys it defines
    // must beat base when the DB has no entry for them.
    const base = { meta: { title: "Base", description: "Base Desc" } };
    const tenant = { meta: { description: "Tenant Desc" } };
    const db = {};

    const result = compose(base, tenant, db);

    expect(result.meta.description).toBe("Tenant Desc");
    expect(result.meta.title).toBe("Base");
  });

  it("null/empty dbOverride leaves base+tenant merge intact", () => {
    // WHY: When readStoreSettings returns null (no DB / no row) the DB layer
    // contributes nothing — the two-layer static merge should be unchanged.
    const base = { meta: { title: "Base" }, nav: { home: "Home" } };
    const tenant = { meta: { title: "Tenant" } };

    const result = compose(base, tenant, {});

    expect(result.meta.title).toBe("Tenant");
    expect(result.nav.home).toBe("Home");
  });

  it("locale objects are independent — fr change does not bleed into en", () => {
    // WHY: Each locale is composed separately. Simulates calling composeDictionary
    // twice with different locale inputs and verifies no cross-contamination.
    const baseFr = { meta: { title: "Titre" } };
    const baseEn = { meta: { title: "Title" } };
    const tenantFr = { meta: { description: "Description FR" } };
    const tenantEn = {};

    const resultFr = compose(baseFr, tenantFr, {});
    const resultEn = compose(baseEn, tenantEn, {});

    expect(resultFr.meta.description).toBe("Description FR");
    expect(resultEn.meta.description).toBeUndefined();
  });

  it("deep merges recursively — nested db key patches without clobbering siblings", () => {
    // WHY: deepMerge is recursive. A DB override that only specifies one nested
    // key must not erase sibling keys in the same object.
    const base = { meta: { title: "Base", og: { image: "base.jpg" } } };
    const tenant = { meta: { og: { image: "tenant.jpg", alt: "Tenant Alt" } } };
    const db = { meta: { og: { image: "db.jpg" } } };

    const result = compose(base, tenant, db);

    expect(result.meta.og.image).toBe("db.jpg");      // DB wins on leaf
    expect(result.meta.og.alt).toBe("Tenant Alt");    // tenant sibling preserved
    expect(result.meta.title).toBe("Base");            // base inherited
  });

  it("returns a new object — does not mutate base", () => {
    // WHY: Immutability — composeDictionary must never mutate its inputs so
    // the static JSON imports remain stable across multiple calls.
    const base = { meta: { title: "Original" } };

    compose(base, { meta: { title: "Override" } }, {});

    expect(base.meta.title).toBe("Original");
  });
});

// WHY: getDictionary integrates the caching layer with the DB read. In test env
// readStoreSettings returns null (no Supabase), so the DB layer is a no-op.
// We verify the static base+tenant merge still works end-to-end.
describe("getDictionary (integration — no DB in test env)", () => {
  it("returns a dictionary with a nav key for fr locale", async () => {
    // WHY: Without a DB row, getDictionary must still return the full
    // base+tenant merged dictionary. nav is UI copy present in the base content
    // file (SEO meta now lives in the separate seo layer), confirming the static
    // merge path runs successfully.
    const dict = await getDictionary("fr");
    expect(dict).toBeDefined();
    expect(typeof dict).toBe("object");
    expect(dict.nav).toBeDefined();
  });

  it("returns a dictionary with a nav key for en locale", async () => {
    // WHY: Locale parity — the en path must work identically to fr even when
    // there is no DB override. Catches missing en content files or import errors.
    const dict = await getDictionary("en");
    expect(dict).toBeDefined();
    expect(typeof dict).toBe("object");
    expect(dict.nav).toBeDefined();
  });

  it("fr and en dictionaries are independent objects", async () => {
    // WHY: Each locale is a separate merge composition. They must not share
    // object references so mutations in one cannot affect the other.
    const fr = await getDictionary("fr");
    const en = await getDictionary("en");
    expect(fr).not.toBe(en);
  });

  // WHY: Phase-04 comparison pages render `dict.comparison.decisionHeading` at
  // request time. The `Dictionary` TYPE derives from src/dictionaries/en.json, so
  // adding a key there type-checks even when the RUNTIME source (config/base
  // content) lacks it — the page then 500s on `dict.comparison` undefined. These
  // assert the key exists in the composed runtime dict, not just the type.
  it("fr runtime dict exposes comparison.decisionHeading (renders Phase-04 pages)", async () => {
    const dict = await getDictionary("fr");
    expect(dict.comparison?.decisionHeading).toBeDefined();
    expect(typeof dict.comparison.decisionHeading).toBe("string");
    expect(dict.comparison.decisionHeading.length).toBeGreaterThan(0);
  });

  it("en runtime dict exposes comparison.decisionHeading (locale parity)", async () => {
    const dict = await getDictionary("en");
    expect(dict.comparison?.decisionHeading).toBeDefined();
    expect(typeof dict.comparison.decisionHeading).toBe("string");
    expect(dict.comparison.decisionHeading.length).toBeGreaterThan(0);
  });
});
