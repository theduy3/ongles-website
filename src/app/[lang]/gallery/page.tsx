import type { Metadata } from "next";
import type { LangParams } from "@/lib/i18n";
import { requireLocale, resolveLocale } from "../locale-guard";
import { getDictionary } from "../dictionaries";
import { getSeo } from "../seo-content";
import { getPageSeo } from "../page-seo";
import { JsonLd } from "@/components/JsonLd";
import { PageHeader } from "@/components/PageHeader";
import { Gallery } from "@/components/Gallery";
import {
  galleryImages,
  buildGallerySlides,
  galleryAlt,
  galleryCaption,
} from "@/lib/gallery";

export async function generateMetadata({
  params,
}: LangParams): Promise<Metadata> {
  const lang = await resolveLocale(params);
  if (!lang) return {};
  const seo = await getSeo(lang);
  const page = await getPageSeo(lang);
  return page.metadata("/gallery", {
    title: seo.meta.galleryTitle,
    description: seo.meta.galleryDescription,
  });
}

export default async function GalleryPage({ params }: LangParams) {
  const lang = await requireLocale(params);
  const dict = await getDictionary(lang);
  const seo = await getSeo(lang);
  const page = await getPageSeo(lang);

  const slides = buildGallerySlides(seo, dict);

  return (
    <>
      <JsonLd
        data={page.gallery(dict.gallery.title, galleryImages, (id) => ({
          alt: galleryAlt(seo, id),
          caption: galleryCaption(dict, id),
        }))}
      />
      <JsonLd
        data={page.breadcrumb([
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
