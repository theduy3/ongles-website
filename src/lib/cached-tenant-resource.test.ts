import { describe, it, expect, mock } from "bun:test";

// unstable_cache is stubbed as a passthrough that forwards args to the resolver
// (its behavior inside a real Next.js runtime for a cache miss). React `cache`
// is stubbed as identity. This lets us exercise the module's own composition
// without a Next.js runtime.
mock.module("next/cache", () => ({
  unstable_cache:
    (fn: (...a: unknown[]) => unknown) =>
    (...a: unknown[]) =>
      fn(...a),
}));

const { cachedTenantResource } = await import("@/lib/cached-tenant-resource");

describe("cachedTenantResource", () => {
  it("forwards args to the resolver and returns its result", async () => {
    const resolver = async (locale: string) => `resolved:${locale}`;
    const get = cachedTenantResource(["ns", "tenant-a"], { tags: ["ns:tenant-a"] }, resolver);
    expect(await get("fr")).toBe("resolved:fr");
    expect(await get("en")).toBe("resolved:en");
  });

  it("propagates a resolver error and invokes the resolver exactly once", async () => {
    // WHY: the module must NOT swallow a resolver failure and silently retry it.
    // The prior broad-catch fallback ran the resolver a SECOND time on any throw,
    // doubling execution and surfacing the retry's stack instead of the original.
    // A genuine resolver bug must surface on its first throw, run once.
    let calls = 0;
    const resolver = async () => {
      calls += 1;
      throw new Error("resolver boom");
    };
    const get = cachedTenantResource(["ns", "t"], { tags: ["ns:t"] }, resolver);
    await expect(get()).rejects.toThrow("resolver boom");
    expect(calls).toBe(1);
  });
});
