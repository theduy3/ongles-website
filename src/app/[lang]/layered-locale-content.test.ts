import { describe, it, expect, mock } from "bun:test";

mock.module("next/cache", () => ({
  unstable_cache: (fn: (...a: unknown[]) => unknown) => fn,
}));
mock.module("react", () => ({ cache: (fn: (...a: unknown[]) => unknown) => fn }));

const { layeredLocaleContent, composeLayers } = await import(
  "@/app/[lang]/layered-locale-content"
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = Record<string, any>;

describe("composeLayers (base -> tenant -> db precedence)", () => {
  it("db wins over tenant wins over base", () => {
    const r = composeLayers(
      { meta: { title: "Base", description: "Base Desc" } },
      { meta: { title: "Tenant Title" } },
      { meta: { title: "DB Title" } },
    ) as Any;
    expect(r.meta.title).toBe("DB Title");
    expect(r.meta.description).toBe("Base Desc");
  });

  it("tenant wins over base when db has no key", () => {
    const r = composeLayers(
      { meta: { title: "Base", description: "Base Desc" } },
      { meta: { description: "Tenant Desc" } },
      {},
    ) as Any;
    expect(r.meta.description).toBe("Tenant Desc");
    expect(r.meta.title).toBe("Base");
  });

  it("deep-merges recursively without clobbering siblings", () => {
    const r = composeLayers(
      { meta: { title: "Base", og: { image: "base.jpg" } } },
      { meta: { og: { image: "tenant.jpg", alt: "Tenant Alt" } } },
      { meta: { og: { image: "db.jpg" } } },
    ) as Any;
    expect(r.meta.og.image).toBe("db.jpg");
    expect(r.meta.og.alt).toBe("Tenant Alt");
    expect(r.meta.title).toBe("Base");
  });

  it("does not mutate base", () => {
    const base = { meta: { title: "Original" } };
    composeLayers(base, { meta: { title: "X" } }, {});
    expect(base.meta.title).toBe("Original");
  });
});

describe("layeredLocaleContent (real resolver via injected readSettings)", () => {
  const base = {
    fr: { nav: { home: "Accueil" }, meta: { title: "Base FR" } },
    en: { nav: { home: "Home" }, meta: { title: "Base EN" } },
  };
  const tenants = {
    "t1": { fr: { meta: { title: "Tenant FR" } }, en: {} },
  };

  it("composes base+tenant when readSettings returns null (no DB)", async () => {
    const get = layeredLocaleContent<Any>({
      base, tenants, tenantId: "t1",
      cacheKey: "store-content", tag: "store-content:t1",
      readSettings: async () => null,
      readDbLayer: (settings, locale) =>
        ((settings as Any)?.content?.[locale] as Any) ?? {},
    });
    const fr = await get("fr");
    expect(fr.meta.title).toBe("Tenant FR");
    expect(fr.nav.home).toBe("Accueil");
  });

  it("db layer (from injected settings) wins over tenant and base", async () => {
    const get = layeredLocaleContent<Any>({
      base, tenants, tenantId: "t1",
      cacheKey: "store-content", tag: "store-content:t1",
      readSettings: async () => ({ content: { fr: { meta: { title: "DB FR" } } } }) as Any,
      readDbLayer: (settings, locale) =>
        ((settings as Any)?.content?.[locale] as Any) ?? {},
    });
    const fr = await get("fr");
    expect(fr.meta.title).toBe("DB FR");
  });

  it("readDbLayer can transform settings (e.g. legacy shim) before merge", async () => {
    const get = layeredLocaleContent<Any>({
      base, tenants, tenantId: "t1",
      cacheKey: "store-seo", tag: "store-seo:t1",
      readSettings: async () => ({ legacy: { fr: { meta: { title: "Lifted" } } } }) as Any,
      readDbLayer: (settings, locale) =>
        ((settings as Any)?.legacy?.[locale] as Any) ?? {},
    });
    const fr = await get("fr");
    expect(fr.meta.title).toBe("Lifted");
  });

  it("locales are independent objects", async () => {
    const get = layeredLocaleContent<Any>({
      base, tenants, tenantId: "t1",
      cacheKey: "store-content", tag: "store-content:t1",
      readSettings: async () => null,
      readDbLayer: () => ({}),
    });
    expect(await get("fr")).not.toBe(await get("en"));
  });
});
