import Image from "next/image";

export type GallerySlide = {
  id: string;
  file: string;
  alt: string;
  caption: string;
};

// Responsive nail-art grid. Each tile is a square cover image with a caption
// that fades in on hover/focus. Pure presentational server component.
export function Gallery({ slides }: { slides: GallerySlide[] }) {
  if (slides.length === 0) return null;
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {slides.map((slide) => (
        <li
          key={slide.id}
          className="group relative aspect-square overflow-hidden rounded-2xl bg-fog"
        >
          <Image
            src={slide.file}
            alt={slide.alt}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 30vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-espresso/70 to-transparent p-4 text-sm font-medium text-cream opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            {slide.caption}
          </span>
        </li>
      ))}
    </ul>
  );
}
