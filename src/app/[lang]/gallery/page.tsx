import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type LangParams } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { getSeo } from "../seo-content";
import { pageMetadata, imageGalleryGraph, breadcrumbGraph } from "@/lib/seo";
import { getStoreConfig } from "@/lib/store-config";
import { JsonLd } from "@/components/JsonLd";
import { PageHeader } from "@/components/PageHeader";
import { Gallery } from "@/components/Gallery";
import { galleryImages } from "@/lib/gallery";

export async function generateMetadata({
  params,
}: LangParams): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const seo = await getSeo(lang);
  const { site, locations } = await getStoreConfig();
  return pageMetadata(lang, "/gallery", {
    title: seo.meta.galleryTitle,
    description: seo.meta.galleryDescription,
  }, { site, locations });
}

export default async function GalleryPage({ params }: LangParams) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const seo = await getSeo(lang);
  const { site, locations } = await getStoreConfig();

  // alt is SEO-owned (seo.gallery), caption is UI-owned (dict.gallery.photos).
  const altFor = (id: string) =>
    (seo.gallery as Record<string, { alt: string }>)[id]?.alt ?? "";
  const captionFor = (id: string) =>
    dict.gallery.photos[id as keyof typeof dict.gallery.photos].caption;

  const slides = galleryImages.map((img) => ({
    id: img.id,
    file: img.file,
    alt: altFor(img.id),
    caption: captionFor(img.id),
  }));

  return (
    <>
      <JsonLd
        data={imageGalleryGraph(dict.gallery.title, galleryImages, (id) => ({
          alt: altFor(id),
          caption: captionFor(id),
        }), { site, locations })}
      />
      <JsonLd
        data={breadcrumbGraph(lang, [
          { name: dict.nav.home, route: "" },
          { name: dict.nav.gallery, route: "/gallery" },
        ], { site, locations })}
      />
      <PageHeader title={dict.gallery.title} intro={dict.gallery.intro} />
      <section className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <Gallery slides={slides} />
      </section>
    </>
  );
}
