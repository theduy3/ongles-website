import { describe, expect, it } from "bun:test";
import { navHref } from "@/lib/nav";
import type { TenantSite } from "@/config/types";

const nav: TenantSite["nav"] = [
  { key: "pricing", href: "/tarifs", hrefByLocale: { fr: "/tarifs", en: "/pricing" } },
  { key: "about", href: "/about" },
];

// Resolve a nav entry to a locale-prefixed href. The hrefByLocale ?? href ??
// fallback chain plus the /{lang} prefix was duplicated verbatim across the
// home and service-detail pages.
describe("navHref", () => {
  it("prefers the per-locale href, locale-prefixed", () => {
    expect(navHref("en", nav, "pricing", "/tarifs")).toBe("/en/pricing");
    expect(navHref("fr", nav, "pricing", "/tarifs")).toBe("/fr/tarifs");
  });

  it("falls back to the default href when no per-locale override exists", () => {
    expect(navHref("en", nav, "about", "/x")).toBe("/en/about");
  });

  it("falls back to the given fallback when the key is absent", () => {
    expect(navHref("en", nav, "missing", "/tarifs")).toBe("/en/tarifs");
  });
});
