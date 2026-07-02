import type { Metadata } from "next";
import { AnswerBlock } from "@/components/AnswerBlock";
import { Reveal } from "@/components/Reveal";
import { SalonCard, buildSalonCards } from "@/components/SalonCard";
import { JsonLd } from "@/components/JsonLd";
import { getDictionary } from "../dictionaries";
import { getSeo } from "../seo-content";
import { getPageSeo } from "../page-seo";
import type { LangParams } from "@/lib/i18n";
import { requireLocale, resolveLocale } from "../locale-guard";
import { getStoreConfig } from "@/lib/store-config";

export async function generateMetadata({
  params,
}: LangParams): Promise<Metadata> {
  const lang = await resolveLocale(params);
  if (!lang) return {};
  const seo = await getSeo(lang);
  const page = await getPageSeo(lang);
  return page.metadata("/locations", {
    title: seo.meta.locationsTitle,
    description: seo.meta.locationsDescription,
  });
}

export default async function LocationsPage({ params }: LangParams) {
  const lang = await requireLocale(params);
  const dict = await getDictionary(lang);
  const seo = await getSeo(lang);
  const { site, locations } = await getStoreConfig();
  const page = await getPageSeo(lang);
  const cards = buildSalonCards(dict, lang, site, locations);

  return (
    <>
      <JsonLd
        data={page.breadcrumb([
          { name: dict.nav.home, route: "" },
          { name: dict.nav.locations, route: "/locations" },
        ])}
      />
      <AnswerBlock
        heading={seo.locations.answerHeading}
        text={seo.locations.answerBlock}
      />

      <section className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, i) => (
            <Reveal key={card.name} delay={i * 0.07}>
              <SalonCard {...card} />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20 md:pb-28">
        <Reveal>
          <h2 className="text-3xl text-espresso md:text-4xl">
            {dict.locations.visit.heading}
          </h2>
        </Reveal>
        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
          <Reveal>
            <h3 className="text-lg font-semibold text-espresso">
              {dict.locations.visit.gettingHereTitle}
            </h3>
            <p className="mt-2 leading-relaxed text-mocha">
              {dict.locations.visit.gettingHere}
            </p>
          </Reveal>
          <Reveal delay={0.07}>
            <h3 className="text-lg font-semibold text-espresso">
              {dict.locations.visit.walkinTitle}
            </h3>
            <p className="mt-2 leading-relaxed text-mocha">
              {dict.locations.visit.walkin}
            </p>
          </Reveal>
          <Reveal delay={0.14}>
            <h3 className="text-lg font-semibold text-espresso">
              {dict.locations.visit.expectTitle}
            </h3>
            <p className="mt-2 leading-relaxed text-mocha">
              {dict.locations.visit.expect}
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
