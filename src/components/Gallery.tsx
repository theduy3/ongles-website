import Image from "next/image";

export type GallerySlide = {
  id: string;
  file: string;
  alt: string;
  caption: string;
};

// Featured-large nail-art grid: the first tile spans 2×2, the rest fill around
// it. Square cover images with a caption that fades in on hover. Server component.
export function Gallery({ slides }: { slides: GallerySlide[] }) {
  if (slides.length === 0) return null;
  return (
    <ul className="grid auto-rows-[160px] grid-cols-2 gap-4 sm:auto-rows-[200px] md:grid-cols-4">
      {slides.map((slide, i) => (
        <li
          key={slide.id}
          className={`group relative overflow-hidden rounded-xl bg-white shadow-card ${
            i === 0 ? "col-span-2 row-span-2" : ""
          }`}
        >
          <Image
            src={slide.file}
            alt={slide.alt}
            fill
            sizes={i === 0 ? "(max-width:768px) 100vw, 50vw" : "(max-width:768px) 50vw, 25vw"}
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
