import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Reveal } from "@/components/Reveal";
import { JsonLd } from "@/components/JsonLd";
import { getDictionary } from "../dictionaries";
import { isLocale, type LangParams } from "@/lib/i18n";
import { pageMetadata, breadcrumbGraph } from "@/lib/seo";

export async function generateMetadata({
  params,
}: LangParams): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return pageMetadata(lang, "/pure-parties", {
    title: dict.meta.purePartiesTitle,
    description: dict.meta.purePartiesDescription,
  });
}

export default async function PurePartiesPage({ params }: LangParams) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <>
      <JsonLd
        data={breadcrumbGraph(lang, [
          { name: dict.nav.home, route: "" },
          { name: dict.nav.pureParties, route: "/pure-parties" },
        ])}
      />
      <PageHeader
        title={dict.pureParties.heading}
        intro={dict.pureParties.intro}
      />

      <section className="mx-auto max-w-3xl px-6 py-20 md:py-28">
        <div className="space-y-6">
          {dict.pureParties.body.map((paragraph, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <p className="text-lg leading-relaxed text-mocha">{paragraph}</p>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <div className="mt-12">
            <Button href={`/${lang}/contact`}>{dict.nav.contact}</Button>
          </div>
        </Reveal>
      </section>
    </>
  );
}
