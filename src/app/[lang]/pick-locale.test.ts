import { describe, expect, it } from "bun:test";
import { pickLocale } from "./pick-locale";

// pickLocale is the pure decision behind the request-time locale guard shells
// (requireLocale / resolveLocale). It answers: given the raw [lang] segment and
// an optional single-locale restriction, is this a locale we should serve?
// The framework shells (notFound() vs return {}) are thin wrappers over this.
describe("pickLocale", () => {
  it("returns the locale for a supported segment", () => {
    expect(pickLocale("fr")).toBe("fr");
    expect(pickLocale("en")).toBe("en");
  });

  it("returns null for an unsupported segment", () => {
    expect(pickLocale("de")).toBeNull();
    expect(pickLocale("")).toBeNull();
    expect(pickLocale("EN")).toBeNull();
  });

  it("returns the locale when it matches the single-locale restriction", () => {
    expect(pickLocale("fr", "fr")).toBe("fr");
    expect(pickLocale("en", "en")).toBe("en");
  });

  it("returns null when a supported locale is the wrong single-locale", () => {
    // /tarifs is FR-only, /pricing is EN-only — a valid but wrong locale is a 404.
    expect(pickLocale("en", "fr")).toBeNull();
    expect(pickLocale("fr", "en")).toBeNull();
  });
});
