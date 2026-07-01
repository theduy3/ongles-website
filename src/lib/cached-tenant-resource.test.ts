import { describe, it, expect, mock } from "bun:test";

// Controllable stubs for Next/React cache primitives so we can exercise BOTH the
// happy path (cached call succeeds) and the fallback path (cached call throws,
// as it does outside a Next.js runtime). `cacheThrows` flips the behavior.
let cacheThrows = false;
mock.module("next/cache", () => ({
  unstable_cache:
    (fn: (...a: unknown[]) => unknown) =>
    (...a: unknown[]) => {
      if (cacheThrows) throw new Error("unstable_cache: no Next.js runtime");
      return fn(...a);
    },
}));
mock.module("react", () => ({ cache: (fn: (...a: unknown[]) => unknown) => fn }));

const { cachedTenantResource } = await import("@/lib/cached-tenant-resource");

describe("cachedTenantResource — cached path", () => {
  it("forwards args to the resolver and returns its result", async () => {
    cacheThrows = false;
    const resolver = async (locale: string) => `resolved:${locale}`;
    const get = cachedTenantResource(["ns", "tenant-a"], { tags: ["ns:tenant-a"] }, resolver);
    expect(await get("fr")).toBe("resolved:fr");
    expect(await get("en")).toBe("resolved:en");
  });
});

describe("cachedTenantResource — fallback path (cached layer throws)", () => {
  it("runs the resolver uncached with the same args and returns its value", async () => {
    cacheThrows = true;
    const seen: string[] = [];
    const resolver = async (locale: string) => {
      seen.push(locale);
      return `fallback:${locale}`;
    };
    const get = cachedTenantResource(["ns", "t"], { tags: ["ns:t"] }, resolver);
    // The cached layer throws → wrapper must fall through to the raw resolver.
    expect(await get("fr")).toBe("fallback:fr");
    expect(seen).toEqual(["fr"]); // resolver actually invoked, with the forwarded arg
    cacheThrows = false; // reset for isolation
  });

  it("supports argless resolvers on the fallback path", async () => {
    cacheThrows = true;
    let calls = 0;
    const resolver = async () => {
      calls += 1;
      return "value";
    };
    const get = cachedTenantResource(["ns", "t2"], { tags: ["ns:t2"] }, resolver);
    expect(await get()).toBe("value");
    expect(calls).toBe(1);
    cacheThrows = false;
  });
});
