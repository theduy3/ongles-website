import { describe, expect, it } from "bun:test";
import { navHref, navItemHref } from "@/lib/nav";
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

// Item-based resolver: what Header maps over (it holds the nav item, not the
// key). The key-based navHref above delegates to this, so both entry points
// share one locale-slug rule.
describe("navItemHref", () => {
  it("prefers the per-locale href, locale-prefixed", () => {
    expect(navItemHref("en", nav[0])).toBe("/en/pricing");
    expect(navItemHref("fr", nav[0])).toBe("/fr/tarifs");
  });

  it("falls back to the default href when no per-locale override exists", () => {
    expect(navItemHref("en", nav[1])).toBe("/en/about");
  });

  it("prefixes anchor hrefs with the locale", () => {
    expect(navItemHref("en", { key: "services", href: "#services" })).toBe(
      "/en#services",
    );
  });

  it("maps a root href to the bare locale, no trailing slash", () => {
    expect(navItemHref("en", { key: "home", href: "/" })).toBe("/en");
  });
});
