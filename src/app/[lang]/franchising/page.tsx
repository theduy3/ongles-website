import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Reveal } from "@/components/Reveal";
import { JsonLd } from "@/components/JsonLd";
import { site } from "@/lib/site";
import { getDictionary } from "../dictionaries";
import { isLocale, type LangParams } from "@/lib/i18n";
import { pageMetadata, breadcrumbGraph } from "@/lib/seo";

export async function generateMetadata({
  params,
}: LangParams): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return pageMetadata(lang, "/franchising", {
    title: dict.meta.franchisingTitle,
    description: dict.meta.franchisingDescription,
  });
}

export default async function FranchisingPage({ params }: LangParams) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <>
      <JsonLd
        data={breadcrumbGraph(lang, [
          { name: dict.nav.home, route: "" },
          { name: dict.nav.franchising, route: "/franchising" },
        ])}
      />
      <PageHeader
        title={dict.franchising.heading}
        intro={dict.franchising.intro}
      />

      <section className="mx-auto max-w-3xl px-6 py-20 md:py-28">
        <div className="space-y-6">
          {dict.franchising.body.map((paragraph, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <p className="text-lg leading-relaxed text-mocha">{paragraph}</p>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <div className="mt-12 flex flex-col items-start gap-4 sm:flex-row">
            <Button href={site.booker.brand}>{dict.cta.book}</Button>
            <Button href={`/${lang}/contact`} variant="outline">
              {dict.nav.contact}
            </Button>
          </div>
        </Reveal>
      </section>
    </>
  );
}
