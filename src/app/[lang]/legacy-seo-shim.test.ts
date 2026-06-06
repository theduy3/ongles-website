// src/app/[lang]/legacy-seo-shim.test.ts
import { describe, expect, it } from "bun:test";
import { liftLegacySeo } from "@/app/[lang]/legacy-seo-shim";

describe("liftLegacySeo", () => {
  it("passes through legacy meta", () => {
    const out = liftLegacySeo({ meta: { homeTitle: "Legacy" } });
    expect(out.meta).toEqual({ homeTitle: "Legacy" });
  });

  it("renames serviceDetails -> services and keeps only SEO fields", () => {
    const out = liftLegacySeo({
      serviceDetails: {
        "pose-ongles": {
          metaTitle: "T",
          metaDescription: "D",
          heroAlt: "A",
          hygiene: "UI copy — drop",
          whyUs: "UI copy — drop",
        },
      },
    });
    expect(out.services).toEqual({
      "pose-ongles": { metaTitle: "T", metaDescription: "D", heroAlt: "A" },
    });
  });

  it("unwraps gallery.photos.{id}.alt -> gallery.{id}.alt", () => {
    const out = liftLegacySeo({
      gallery: { photos: { "nail-art-1": { alt: "Alt" } } },
    });
    expect(out.gallery).toEqual({ "nail-art-1": { alt: "Alt" } });
  });

  it("returns {} for undefined / empty / non-object input", () => {
    expect(liftLegacySeo(undefined)).toEqual({});
    expect(liftLegacySeo({})).toEqual({});
    expect(liftLegacySeo({ unrelated: "x" })).toEqual({});
  });

  it("omits a service entry that has no SEO fields", () => {
    const out = liftLegacySeo({
      serviceDetails: { "pose-ongles": { hygiene: "only UI copy" } },
    });
    expect(out.services).toBeUndefined();
  });

  it("lifts subtrees independently (meta only, no services/gallery)", () => {
    const out = liftLegacySeo({ meta: { homeTitle: "X" } });
    expect(out.services).toBeUndefined();
    expect(out.gallery).toBeUndefined();
  });
});
