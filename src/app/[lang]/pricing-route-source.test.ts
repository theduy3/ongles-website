import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

// Source tripwires for the collapsed FR/EN route pairs.
//
// The FR/EN comparison and pricing folders share one body each, living in the
// comparison-route / pricing-route factories; each folder's page.tsx is a thin
// shell binding one fact — the locale it serves. Two things must not regress:
//
//   1. The shared body still derives the pricing route from its owner
//      (pricingPath / pricingPathsByLocale in src/lib/routes.ts), never a
//      re-hardcoded /tarifs vs /pricing literal.
//   2. Each shell binds the CORRECT locale. A copy-paste that leaves both
//      folders on the same locale would 404 one whole route silently — no unit
//      test catches it, so it is guarded here at the source.
//
// Positive checks (references the owner / correct make*()) carry the guarantee;
// negatives target CODE shapes so they don't trip on doc comments. The owner
// (routes.ts) and per-tenant nav `hrefByLocale` are deliberately NOT covered.

const read = (p: string) => readFileSync(p, "utf8");

describe("collapsed routes — shared body derives from the pricing owner", () => {
  test("comparison factory links pricing via pricingPath, not a literal", () => {
    const src = read("src/app/[lang]/comparison-route.tsx");
    expect(src).toContain("pricingPath(lang)");
    expect(src).not.toContain("`/${lang}/tarifs`");
    expect(src).not.toContain("`/${lang}/pricing`");
  });

  test("pricing factory routes metadata + breadcrumb through the owner", () => {
    const src = read("src/app/[lang]/pricing-route.tsx");
    expect(src).toContain("pricingPath(lang)");
    expect(src).toContain("pricingPathsByLocale()");
    expect(src).not.toContain('routeByLocale: { fr:');
  });

  test("sitemap emits the pricing pair from pricingPathsByLocale", () => {
    const src = read("src/app/sitemap.ts");
    expect(src).toContain("pricingPathsByLocale()");
    expect(src).not.toContain('{ fr: "/tarifs", en: "/pricing" }');
  });
});

describe("collapsed routes — each shell binds its correct locale", () => {
  test("FR comparison shell binds fr", () => {
    const src = read("src/app/[lang]/comparaisons/[slug]/page.tsx");
    expect(src).toContain('makeComparisonRoute("fr")');
    expect(src).not.toContain('makeComparisonRoute("en")');
  });

  test("EN comparison shell binds en", () => {
    const src = read("src/app/[lang]/comparisons/[slug]/page.tsx");
    expect(src).toContain('makeComparisonRoute("en")');
    expect(src).not.toContain('makeComparisonRoute("fr")');
  });

  test("FR pricing shell binds fr", () => {
    const src = read("src/app/[lang]/tarifs/page.tsx");
    expect(src).toContain('makePricingRoute("fr")');
    expect(src).not.toContain('makePricingRoute("en")');
  });

  test("EN pricing shell binds en", () => {
    const src = read("src/app/[lang]/pricing/page.tsx");
    expect(src).toContain('makePricingRoute("en")');
    expect(src).not.toContain('makePricingRoute("fr")');
  });
});
