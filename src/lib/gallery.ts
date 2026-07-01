import type { Dictionary } from "@/lib/dictionary";
import type { SeoDictionary } from "@/lib/seo-dictionary";

// Gallery manifest. `file` is a path under /public. alt + caption live in
// dict.gallery.photos[id]. Add a photo: drop the file in public/images/gallery,
// add an entry here, and add { alt, caption } for the id to the dictionary.
export type GalleryImage = { id: string; file: string };

export const galleryImages: readonly GalleryImage[] = [
  { id: "nail-art-1", file: "/images/gallery/nail-art.jpeg" },
  { id: "nail-art-2", file: "/images/gallery/nail-art-2.jpeg" },
  { id: "nail-art-3", file: "/images/gallery/nail-art-3.jpg" },
  { id: "nail-art-4", file: "/images/gallery/nail-art-4.jpg" },
  { id: "gel-mani", file: "/images/gallery/gel-mani.jpeg" },
  { id: "spa-pedi", file: "/images/services/feet.jpg" },
];

// A gallery image resolved into render-ready props: alt is SEO-owned
// (seo.gallery), caption is UI-owned (dict.gallery.photos). The two resolvers
// and buildGallerySlides are the single source for this merge, which was
// inlined on the home page and duplicated by the gallery page (slide list +
// JsonLd callback).
export type GallerySlide = {
  id: string;
  file: string;
  alt: string;
  caption: string;
};

/** SEO-owned alt for a gallery id; "" when unset. */
export function galleryAlt(seo: SeoDictionary, id: string): string {
  return (seo.gallery as Record<string, { alt: string }>)[id]?.alt ?? "";
}

/** UI-owned caption for a gallery id; "" when unset. */
export function galleryCaption(dict: Dictionary, id: string): string {
  return (
    (dict.gallery.photos as Record<string, { caption: string }>)[id]?.caption ??
    ""
  );
}

export function buildGallerySlides(
  seo: SeoDictionary,
  dict: Dictionary,
): GallerySlide[] {
  return galleryImages.map((img) => ({
    id: img.id,
    file: img.file,
    alt: galleryAlt(seo, img.id),
    caption: galleryCaption(dict, img.id),
  }));
}
