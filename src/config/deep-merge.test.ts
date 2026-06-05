import { expect, test } from "bun:test";
import { deepMerge } from "./deep-merge";

// WHY: dictionary composition must let a tenant re-word any shared string while
// inheriting everything it does not override. These tests encode that contract.

test("inherits base keys the override omits", () => {
  const merged = deepMerge({ nav: { home: "Home", faq: "FAQ" } }, { nav: { faq: "Questions" } });
  expect(merged).toEqual({ nav: { home: "Home", faq: "Questions" } });
});

test("override wins on leaf collisions", () => {
  const merged = deepMerge({ meta: { title: "Maily" } }, { meta: { title: "Charlesbourg" } });
  expect(merged.meta.title).toBe("Charlesbourg");
});

test("merges nested objects recursively, not shallowly", () => {
  const merged = deepMerge(
    { a: { b: { c: 1, d: 2 } } },
    { a: { b: { d: 9 } } },
  );
  expect(merged).toEqual({ a: { b: { c: 1, d: 9 } } });
});

test("arrays replace wholesale (a tenant can shorten a base list)", () => {
  const merged = deepMerge({ items: [1, 2, 3] }, { items: [9] });
  expect(merged.items).toEqual([9]);
});

test("does not mutate the base object", () => {
  const base = { nav: { home: "Home" } };
  deepMerge(base, { nav: { home: "Accueil" } });
  expect(base.nav.home).toBe("Home");
});
