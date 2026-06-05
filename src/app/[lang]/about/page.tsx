import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Reveal } from "@/components/Reveal";
import { JsonLd } from "@/components/JsonLd";
import { getStoreConfig } from "@/lib/store-config";
import { getDictionary } from "../dictionaries";
import { isLocale, type LangParams } from "@/lib/i18n";
import { pageMetadata, breadcrumbGraph } from "@/lib/seo";

export async function generateMetadata({
  params,
}: LangParams): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  const { site, locations } = await getStoreConfig();
  return pageMetadata(lang, "/about", {
    title: dict.meta.aboutTitle,
    description: dict.meta.aboutDescription,
  }, { site, locations });
}

export default async function AboutPage({ params }: LangParams) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const { site, locations } = await getStoreConfig();

  return (
    <>
      <JsonLd
        data={breadcrumbGraph(lang, [
          { name: dict.nav.home, route: "" },
          { name: dict.nav.about, route: "/about" },
        ], { site, locations })}
      />
      <PageHeader title={dict.about.heading} />

      <section className="mx-auto max-w-3xl px-6 py-20 md:py-28">
        <div className="space-y-6">
          {dict.about.body.map((paragraph, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <p className="text-lg leading-relaxed text-mocha">{paragraph}</p>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <div className="mt-12 flex flex-col items-start gap-4 sm:flex-row">
            <Button href={`/${lang}${site.booking}`}>{dict.cta.book}</Button>
            <Button href={`/${lang}/locations`} variant="outline">
              {dict.nav.locations}
            </Button>
          </div>
        </Reveal>
      </section>
    </>
  );
}
