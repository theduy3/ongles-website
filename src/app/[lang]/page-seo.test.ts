import { describe, expect, it, mock } from "bun:test";
import { pageMetadata, breadcrumbGraph, organizationGraph } from "@/lib/seo";
import { site, locations, services, tenant } from "@/config";
import { reviewDataFor } from "@/config/review-honesty";

// getPageSeo is the per-request bound SEO surface: a thin adapter that pre-binds
// { lang, cfg, reviewData } to the pure seo.ts builders. Forwarding is proven by
// deep-equal against the pure builders (their output is proven in seo.test.ts).
//
// getStoreConfig is mocked to the static-config shape (what it returns when
// Supabase is absent) so this test is HERMETIC: several sibling layout/route
// tests do `mock.module("@/lib/store-config", …)` with a partial site, and
// bun's mock.module is process-global — without our own mock, whichever loads
// last would leak its stub in here. Mocking it ourselves pins the cfg we then
// deep-equal against. server-only is stubbed so the module loads under bun.
mock.module("server-only", () => ({}));
mock.module("@/lib/store-config", () => ({
  getStoreConfig: async () => ({ site, locations, services, customCode: [] }),
}));

const { getPageSeo } = await import("@/app/[lang]/page-seo");

const cfg = { site, locations };

describe("getPageSeo binding", () => {
  it("breadcrumb() forwards resolved cfg + lang to breadcrumbGraph", async () => {
    const seo = await getPageSeo("fr");
    const crumbs = [
      { name: "Accueil", route: "" },
      { name: "À propos", route: "/about" },
    ];
    expect(seo.breadcrumb(crumbs)).toEqual(breadcrumbGraph("fr", crumbs, cfg));
  });

  it("metadata() forwards resolved cfg + lang to pageMetadata", async () => {
    const seo = await getPageSeo("en");
    const opts = { title: "T", description: "D" };
    expect(seo.metadata("/about", opts)).toEqual(pageMetadata("en", "/about", opts, cfg));
  });

  it("organization() binds reviewData behind the seam", async () => {
    const seo = await getPageSeo("fr");
    const arg = { name: "N", description: "D" };
    expect(seo.organization(arg)).toEqual(
      organizationGraph("fr", arg, { site, locations, reviewData: reviewDataFor(tenant) }),
    );
  });
});
