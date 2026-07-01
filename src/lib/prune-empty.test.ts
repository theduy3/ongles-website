import { describe, it, expect } from "bun:test";
import { pruneEmpty } from "./prune-empty";

describe("pruneEmpty", () => {
  it("drops undefined, null, empty string", () => {
    expect(pruneEmpty(undefined)).toBeUndefined();
    expect(pruneEmpty(null)).toBeUndefined();
    expect(pruneEmpty("")).toBeUndefined();
  });

  it("keeps 0 and false (not empty)", () => {
    expect(pruneEmpty(0)).toBe(0);
    expect(pruneEmpty(false)).toBe(false);
  });

  it("keeps non-empty scalars", () => {
    expect(pruneEmpty("x")).toBe("x");
    expect(pruneEmpty(42)).toBe(42);
  });

  it("drops empty arrays and objects; keeps non-empty", () => {
    expect(pruneEmpty([])).toBeUndefined();
    expect(pruneEmpty({})).toBeUndefined();
    expect(pruneEmpty([1])).toEqual([1]);
    expect(pruneEmpty({ a: 1 })).toEqual({ a: 1 });
  });

  it("recursively drops empty leaves and collapses now-empty containers", () => {
    expect(
      pruneEmpty({ a: { b: "", c: undefined }, d: { e: "keep" }, f: [] }),
    ).toEqual({ d: { e: "keep" } });
  });

  it("prunes empty items out of arrays", () => {
    expect(pruneEmpty(["a", "", null, "b"])).toEqual(["a", "b"]);
    expect(pruneEmpty([{ x: "" }, { y: "keep" }])).toEqual([{ y: "keep" }]);
  });

  it("does not mutate the input", () => {
    const input = { a: { b: "keep", c: "" } };
    pruneEmpty(input);
    expect(input).toEqual({ a: { b: "keep", c: "" } });
  });

  it("returns non-plain objects (Date) as-is, never dropping them", () => {
    const d = new Date("2020-01-01T00:00:00Z");
    expect(pruneEmpty(d)).toBe(d);
  });

  it("keeps Object.create(null) plain objects with data", () => {
    const o = Object.create(null) as Record<string, unknown>;
    o.a = "x";
    expect(pruneEmpty(o)).toEqual({ a: "x" });
  });
});
