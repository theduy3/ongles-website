import Image from "next/image";

export type GallerySlide = {
  id: string;
  file: string;
  alt: string;
  caption: string;
};

// The first image anchors the grid. Captions stay outside the image so the
// gallery remains legible and useful on touch screens without hover.
export function Gallery({ slides }: { slides: GallerySlide[] }) {
  if (slides.length === 0) return null;

  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-4 md:gap-x-5 md:gap-y-8">
      {slides.map((slide, i) => (
        <li
          key={slide.id}
          className={`group ${i === 0 ? "col-span-2 row-span-2" : ""}`}
        >
          <figure className="flex h-full flex-col gap-3">
            <div
              className={`relative w-full overflow-hidden rounded-2xl bg-white shadow-card ${i === 0 ? "aspect-square" : "aspect-[4/3]"}`}
            >
              <Image
                src={slide.file}
                alt={slide.alt}
                fill
                sizes={
                  i === 0
                    ? "(max-width: 768px) 100vw, 50vw"
                    : "(max-width: 768px) 50vw, 25vw"
                }
                className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
            </div>
            <figcaption className="text-sm text-mocha">{slide.caption}</figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
}
