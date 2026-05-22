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
