import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Reveal } from "@/components/Reveal";
import { JsonLd } from "@/components/JsonLd";
import { getStoreConfig } from "@/lib/store-config";
import { getDictionary } from "../dictionaries";
import { getSeo } from "../seo-content";
import { getPageSeo } from "../page-seo";
import type { LangParams } from "@/lib/i18n";
import { requireLocale, resolveLocale } from "../locale-guard";

export async function generateMetadata({
  params,
}: LangParams): Promise<Metadata> {
  const lang = await resolveLocale(params);
  if (!lang) return {};
  const seo = await getSeo(lang);
  const page = await getPageSeo(lang);
  return page.metadata("/about", {
    title: seo.meta.aboutTitle,
    description: seo.meta.aboutDescription,
  });
}

export default async function AboutPage({ params }: LangParams) {
  const lang = await requireLocale(params);
  const dict = await getDictionary(lang);
  const { site } = await getStoreConfig();
  const page = await getPageSeo(lang);

  return (
    <>
      <JsonLd
        data={page.breadcrumb([
          { name: dict.nav.home, route: "" },
          { name: dict.nav.about, route: "/about" },
        ])}
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
