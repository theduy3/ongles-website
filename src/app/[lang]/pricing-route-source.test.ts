import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

// Source tripwire — the pricing route (/tarifs FR, /pricing EN) has a single
// owner: pricingPath / pricingPathsByLocale in src/lib/routes.ts. Non-nav call
// sites MUST derive from it, never re-hardcode the pair. These assertions fail
// the moment a page inlines the localized literal again, so the owner can't rot.
//
// Positive checks (references the owner) carry the guarantee; the negative
// checks target CODE-specific shapes (template hrefs, routeByLocale object
// literals) so they don't trip on the "/tarifs is FR-only" doc comments.
//
// Scope note: routes.ts (the owner) and per-tenant site.ts nav `hrefByLocale`
// (the intentional override seam) are deliberately NOT covered here.

const read = (p: string) => readFileSync(p, "utf8");

describe("pricing-route source tripwire — pages derive from the owner", () => {
  test("tarifs page routes metadata + breadcrumb through pricingPath", () => {
    const src = read("src/app/[lang]/tarifs/page.tsx");
    expect(src).toContain("pricingPath(lang)");
    expect(src).toContain("pricingPathsByLocale()");
    // no re-hardcoded routeByLocale pair
    expect(src).not.toContain('routeByLocale: { fr:');
  });

  test("pricing page routes metadata + breadcrumb through pricingPath", () => {
    const src = read("src/app/[lang]/pricing/page.tsx");
    expect(src).toContain("pricingPath(lang)");
    expect(src).toContain("pricingPathsByLocale()");
    expect(src).not.toContain('routeByLocale: { fr:');
  });

  test("FR comparison page links pricing via pricingPath, not a literal", () => {
    const src = read("src/app/[lang]/comparaisons/[slug]/page.tsx");
    expect(src).toContain("pricingPath(lang)");
    expect(src).not.toContain("`/${lang}/tarifs`");
  });

  test("EN comparison page links pricing via pricingPath, not a literal", () => {
    const src = read("src/app/[lang]/comparisons/[slug]/page.tsx");
    expect(src).toContain("pricingPath(lang)");
    expect(src).not.toContain("`/${lang}/pricing`");
  });

  test("sitemap emits the pricing pair from pricingPathsByLocale", () => {
    const src = read("src/app/sitemap.ts");
    expect(src).toContain("pricingPathsByLocale()");
    expect(src).not.toContain('{ fr: "/tarifs", en: "/pricing" }');
  });
});
