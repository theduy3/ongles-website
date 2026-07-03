// src/app/[lang]/seo-content.shim.test.ts
import { describe, expect, it, mock } from "bun:test";
import type { StoreSettings } from "@/lib/store-settings-schema";

// Only the framework-shell modules are mocked (process-global, but harmless
// no-ops). The store reader is INJECTED via makeGetSeo — NOT mock.module-ed:
// mock.module("@/lib/store-settings-store") is process-global and binds at
// seo-content's module-load, so whichever test imported seo-content first won
// the binding, making these tests pass or fail by file order (they failed on
// CI's order). Injection sidesteps module caching entirely. seo-content is
// dynamic-imported below so the server-only mock is registered first.
mock.module("server-only", () => ({}));
mock.module("next/cache", () => ({
  unstable_cache: (fn: (...a: unknown[]) => unknown) => fn,
}));

const { makeGetSeo } = await import("@/app/[lang]/seo-content");

// Store row carrying LEGACY content-namespace SEO plus one explicit new-namespace
// `seo` edit that must win on collision.
const getSeo = makeGetSeo(async () => ({
  content: {
    en: {
      meta: { homeTitle: "Legacy Home" },
      serviceDetails: {
        "pose-ongles": { metaTitle: "Legacy Service", hygiene: "UI copy" },
      },
      gallery: { photos: { "nail-art-1": { alt: "Legacy Alt" } } },
    },
  },
  seo: { en: { meta: { homeTitle: "New Home" } } },
}) as unknown as StoreSettings);

describe("getSeo — legacy content shim", () => {
  it("lifts legacy serviceDetails.metaTitle into services", async () => {
    const seo = await getSeo("en");
    expect(seo.services["pose-ongles"].metaTitle).toBe("Legacy Service");
  });

  it("explicit seo edit beats legacy on collision", async () => {
    const seo = await getSeo("en");
    expect(seo.meta.homeTitle).toBe("New Home");
  });

  it("unwraps legacy gallery photos alt", async () => {
    const seo = await getSeo("en");
    expect(seo.gallery["nail-art-1"].alt).toBe("Legacy Alt");
  });

  it("drops non-SEO UI copy from lifted service", async () => {
    const seo = await getSeo("en");
    expect(
      (seo.services["pose-ongles"] as Record<string, unknown>).hygiene,
    ).toBeUndefined();
  });
});
