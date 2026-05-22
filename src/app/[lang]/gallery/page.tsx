import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type LangParams } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { pageMetadata, imageGalleryGraph, breadcrumbGraph } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { PageHeader } from "@/components/PageHeader";
import { Gallery } from "@/components/Gallery";
import { galleryImages } from "@/lib/gallery";

export async function generateMetadata({
  params,
}: LangParams): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return pageMetadata(lang, "/gallery", {
    title: dict.meta.galleryTitle,
    description: dict.meta.galleryDescription,
  });
}

export default async function GalleryPage({ params }: LangParams) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  const slides = galleryImages.map((img) => {
    const { alt, caption } =
      dict.gallery.photos[img.id as keyof typeof dict.gallery.photos];
    return { id: img.id, file: img.file, alt, caption };
  });

  return (
    <>
      <JsonLd
        data={imageGalleryGraph(dict.gallery.title, galleryImages, (id) =>
          dict.gallery.photos[id as keyof typeof dict.gallery.photos],
        )}
      />
      <JsonLd
        data={breadcrumbGraph(lang, [
          { name: dict.nav.home, route: "" },
          { name: dict.nav.gallery, route: "/gallery" },
        ])}
      />
      <PageHeader title={dict.gallery.title} intro={dict.gallery.intro} />
      <section className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <Gallery slides={slides} />
      </section>
    </>
  );
}
