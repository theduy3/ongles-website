import { test, expect } from "bun:test";
import { routeKeyFromPathname, snippetMatchesKey } from "./route-key";

test("routeKeyFromPathname strips locale and returns first segment", () => {
  expect(routeKeyFromPathname("/en/services")).toBe("services");
  expect(routeKeyFromPathname("/fr/book-online")).toBe("book-online");
  expect(routeKeyFromPathname("/en/services/gel")).toBe("services");
});

test("routeKeyFromPathname maps locale root to home", () => {
  expect(routeKeyFromPathname("/fr")).toBe("home");
  expect(routeKeyFromPathname("/en")).toBe("home");
  expect(routeKeyFromPathname("/")).toBe("home");
});

test("snippetMatchesKey honours wildcard and explicit keys", () => {
  expect(snippetMatchesKey(["*"], "about")).toBe(true);
  expect(snippetMatchesKey(["home", "contact"], "contact")).toBe(true);
  expect(snippetMatchesKey(["home"], "services")).toBe(false);
});
