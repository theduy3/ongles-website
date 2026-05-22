import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Reveal } from "@/components/Reveal";
import { LocationCard } from "@/components/LocationCard";
import { JsonLd } from "@/components/JsonLd";
import { locations } from "@/lib/locations";
import { getDictionary } from "../dictionaries";
import { isLocale, type LangParams } from "@/lib/i18n";
import { pageMetadata, breadcrumbGraph } from "@/lib/seo";

export async function generateMetadata({
  params,
}: LangParams): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return pageMetadata(lang, "/locations", {
    title: dict.meta.locationsTitle,
    description: dict.meta.locationsDescription,
  });
}

export default async function LocationsPage({ params }: LangParams) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <>
      <JsonLd
        data={breadcrumbGraph(lang, [
          { name: dict.nav.home, route: "" },
          { name: dict.nav.locations, route: "/locations" },
        ])}
      />
      <PageHeader
        title={dict.locations.heading}
        intro={dict.locations.intro}
      />

      <section className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {locations.map((loc, i) => (
            <Reveal key={loc.id} delay={i * 0.07}>
              <LocationCard loc={loc} dict={dict} />
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
