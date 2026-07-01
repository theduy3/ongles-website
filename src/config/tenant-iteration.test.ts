import { describe, expect, it } from "bun:test";
import { EXCLUDED_TENANTS, forEachTenant } from "./tenant-iteration";

describe("forEachTenant", () => {
  it("calls fn for every non-excluded tenant and flattens the results", () => {
    const registry = { a: { n: 1 }, b: { n: 2 } };
    const result = forEachTenant(registry, (id, cfg) => [`${id}:${cfg.n}`]);
    expect(result).toEqual(["a:1", "b:2"]);
  });

  it("skips ids in EXCLUDED_TENANTS", () => {
    const excluded = [...EXCLUDED_TENANTS][0];
    const registry = { [excluded]: { n: 0 }, real: { n: 1 } };
    const result = forEachTenant(registry, (id, cfg) => [`${id}:${cfg.n}`]);
    expect(result).toEqual(["real:1"]);
  });

  it("returns an empty array for an empty registry", () => {
    expect(forEachTenant({}, () => [1])).toEqual([]);
  });

  it("flattens a fn that returns multiple items per tenant", () => {
    const registry = { a: { n: 2 } };
    const result = forEachTenant(registry, (id, cfg) =>
      Array.from({ length: cfg.n }, (_, i) => `${id}-${i}`),
    );
    expect(result).toEqual(["a-0", "a-1"]);
  });
});
