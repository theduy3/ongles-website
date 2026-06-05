import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Reveal } from "@/components/Reveal";
import { ServicePhoto } from "@/components/ServicePhoto";
import { JsonLd } from "@/components/JsonLd";
import { servicePath } from "@/lib/services";
import { getStoreConfig } from "@/lib/store-config";
import { getDictionary } from "../dictionaries";
import { isLocale, type LangParams } from "@/lib/i18n";
import { pageMetadata, servicesGraph, breadcrumbGraph } from "@/lib/seo";
import { formatFromPrice } from "@/lib/format";

export async function generateMetadata({
  params,
}: LangParams): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  const { site, locations } = await getStoreConfig();
  return pageMetadata(lang, "/services", {
    title: dict.meta.servicesTitle,
    description: dict.meta.servicesDescription,
  }, { site, locations });
}

export default async function ServicesPage({ params }: LangParams) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const { site, locations, services } = await getStoreConfig();

  // Hub ItemList schema: build ServiceItem[] from registry + dict.
  const items = services.map((s) => ({
    name: dict.serviceDetails[s.id].title,
    description: dict.serviceDetails[s.id].metaDescription,
    price: s.price,
    priceTo: s.priceTo,
    path: servicePath(s, lang),
  }));

  return (
    <>
      <JsonLd data={servicesGraph(lang, items, { site, locations })} />
      <JsonLd
        data={breadcrumbGraph(lang, [
          { name: dict.nav.home, route: "" },
          { name: dict.nav.services, route: "/services" },
        ], { site, locations })}
      />
      <PageHeader
        title={dict.servicesPage.heading}
        intro={dict.servicesPage.intro}
      />

      <section className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <Reveal>
          <p className="mx-auto mb-12 max-w-3xl text-center leading-relaxed text-mocha">
            {dict.servicesPage.lead}
          </p>
        </Reveal>
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((svc, i) => {
            const d = dict.serviceDetails[svc.id];
            const card = dict.services[i];
            const href = `/${lang}${servicePath(svc, lang)}`;
            const priceDisplay = formatFromPrice(
              lang,
              svc.price,
              dict.serviceLabels.priceFrom,
            );
            return (
              <Reveal key={svc.id}>
                <Link href={href} className="group block">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                    <ServicePhoto
                      id={svc.id}
                      photo={svc.photo}
                      alt={d.heroAlt}
                      label={card.title}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="h-full w-full"
                    />
                  </div>
                  <div className="mt-6 flex items-baseline justify-between gap-4">
                    <h2 className="text-xl text-espresso transition-colors group-hover:text-mocha">
                      {card.title}
                    </h2>
                    <span className="shrink-0 text-sm font-semibold text-mocha">
                      {priceDisplay}
                    </span>
                  </div>
                  <p className="mt-2 leading-relaxed text-mocha">{card.body}</p>
                </Link>
              </Reveal>
            );
          })}
        </div>

        <Reveal>
          <div className="mt-16 rounded-2xl bg-sand px-6 py-12 text-center">
            <h2 className="text-2xl text-espresso md:text-3xl">
              {dict.servicesPage.hygieneTitle}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-mocha">
              {dict.servicesPage.hygieneBody}
            </p>
            <p className="mt-8 text-lg text-espresso">
              {dict.servicesPage.ctaLead}
            </p>
            <div className="mt-4 flex justify-center">
              <Button href={`/${lang}${site.booking}`}>{dict.cta.book}</Button>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
