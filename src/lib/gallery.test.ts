import { describe, expect, it } from "bun:test";
import {
  buildGallerySlides,
  galleryAlt,
  galleryCaption,
  galleryImages,
} from "@/lib/gallery";
import type { Dictionary } from "@/lib/dictionary";
import type { SeoDictionary } from "@/lib/seo-dictionary";

const first = galleryImages[0];
const seo = {
  gallery: { [first.id]: { alt: "Alt text" } },
} as unknown as SeoDictionary;
const dict = {
  gallery: { photos: { [first.id]: { caption: "Caption" } } },
} as unknown as Dictionary;

// Gallery slide shaping — alt is SEO-owned (seo.gallery), caption is UI-owned
// (dict.gallery.photos). The same alt/caption resolution was duplicated across
// the home page, the gallery page's slide list, and the gallery page's JsonLd
// callback.
describe("gallery slide resolution", () => {
  it("takes alt from seo and caption from dict", () => {
    expect(galleryAlt(seo, first.id)).toBe("Alt text");
    expect(galleryCaption(dict, first.id)).toBe("Caption");
  });

  it("falls back to empty string for a missing alt", () => {
    expect(galleryAlt(seo, "no-such-id")).toBe("");
  });

  it("builds a slide per manifest image carrying id, file, alt, caption", () => {
    const slides = buildGallerySlides(seo, dict);
    expect(slides.length).toBe(galleryImages.length);
    const slide = slides[0];
    expect(slide.id).toBe(first.id);
    expect(slide.file).toBe(first.file);
    expect(slide.alt).toBe("Alt text");
    expect(slide.caption).toBe("Caption");
  });
});
