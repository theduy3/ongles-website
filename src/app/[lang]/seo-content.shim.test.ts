// src/app/[lang]/seo-content.shim.test.ts
import { describe, expect, it, mock } from "bun:test";

// Do NOT mock.module("react", …) here. mock.module is process-GLOBAL in
// bun:test, so a partial React stub leaks into EVERY later-running test file and
// strips createContext/useEffect/etc., crashing the component + next/navigation
// tests ("createContext is not a function") — non-deterministically, since it
// only bites when file order runs this first (it did on CI, not locally). getSeo
// does not need React.cache stubbed: seo-content's caching seam is
// cachedTenantResource (@/lib/cache-tags), not React.cache.
mock.module("server-only", () => ({}));
mock.module("next/cache", () => ({
  unstable_cache: (fn: (...a: unknown[]) => unknown) => fn,
}));

// Store row carrying LEGACY content-namespace SEO plus one explicit new-namespace
// `seo` edit that must win on collision.
mock.module("@/lib/store-settings-store", () => ({
  readStoreSettings: async () => ({
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
  }),
}));

const { getSeo } = await import("@/app/[lang]/seo-content");

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
