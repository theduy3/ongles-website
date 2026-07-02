import { describe, expect, test } from "bun:test";
import { pricingPath, pricingPathsByLocale } from "@/lib/routes";
import { locales } from "@/lib/i18n";

// The localized-route owner is pure — the interface IS the test surface.
describe("routes — pricingPath", () => {
  test("FR resolves to /tarifs", () => {
    expect(pricingPath("fr")).toBe("/tarifs");
  });

  test("EN resolves to /pricing", () => {
    expect(pricingPath("en")).toBe("/pricing");
  });
});

describe("routes — pricingPathsByLocale", () => {
  test("maps every live locale to its pricing path", () => {
    expect(pricingPathsByLocale()).toEqual({ fr: "/tarifs", en: "/pricing" });
  });

  test("covers exactly the live locale set (no missing/extra keys)", () => {
    expect(Object.keys(pricingPathsByLocale()).sort()).toEqual(
      [...locales].sort(),
    );
  });
});
