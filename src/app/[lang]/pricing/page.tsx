import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AnswerBlock } from "@/components/AnswerBlock";
import { Button } from "@/components/Button";
import { JsonLd } from "@/components/JsonLd";
import { PricingTable } from "@/components/PricingTable";
import type { PricingRow } from "@/components/PricingTable";
import { getStoreConfig } from "@/lib/store-config";
import { servicePath } from "@/lib/services";
import { getDictionary } from "../dictionaries";
import { getSeo } from "../seo-content";
import { getPageSeo } from "../page-seo";
import { isLocale } from "@/lib/i18n";
import type { LangParams } from "@/lib/i18n";

// No generateStaticParams — on-demand rendering via force-dynamic parent layout.
// Wrong-locale guard: /pricing is EN-only; non-en lang → 404.

export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  // Wrong-locale guard: /pricing is the English pricing slug only.
  if (lang !== "en") return {};
  const seo = await getSeo(lang);
  const page = await getPageSeo(lang);
  return page.metadata("/pricing", {
    title: seo.pages.pricing.metaTitle,
    description: seo.pages.pricing.metaDescription,
    routeByLocale: { fr: "/tarifs", en: "/pricing" },
  });
}

export default async function PricingPage({ params }: LangParams) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  // Wrong-locale guard: /pricing is EN-only (Pitfall 1).
  if (lang !== "en") notFound();

  const dict = await getDictionary(lang);
  const seo = await getSeo(lang);
  const { site, services } = await getStoreConfig();
  const page = await getPageSeo(lang);

  const bookHref = `/${lang}${site.booking}`;

  // Build items array for pricingGraph and PricingTable.
  // name comes from dict.serviceDetails[id].title; description from seo.services[id].schemaDescription.
  const rows: PricingRow[] = services.map((service) => ({
    id: service.id,
    name: dict.serviceDetails[service.id].title,
    href: `/${lang}${servicePath(service, lang)}`,
    price: service.price,
    priceTo: service.priceTo,
  }));

  const graphItems = services.map((service) => ({
    name: dict.serviceDetails[service.id].title,
    description: seo.services[service.id].schemaDescription,
    price: service.price,
    priceTo: service.priceTo,
    path: servicePath(service, lang),
  }));

  return (
    <>
      <JsonLd data={page.pricing(graphItems)} />
      <JsonLd
        data={page.breadcrumb([
          { name: dict.nav.home, route: "" },
          { name: dict.nav.pricing, route: "/pricing" },
        ])}
      />

      {/* Answer-first block — carries the single page h1 (D-19) */}
      <AnswerBlock
        heading={seo.pages.pricing.answerHeading}
        text={seo.pages.pricing.answerBlock}
        link={{ href: `/${lang}/services`, label: dict.cta.viewServices }}
      />

      {/* Price list panel */}
      <PricingTable lang={lang} rows={rows} />

      {/* CTA row */}
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 pb-16 sm:flex-row sm:justify-center md:pb-24">
        <Button href={bookHref} variant="solid">
          {dict.cta.book}
        </Button>
        <Button href={site.contact.phoneHref} variant="ghost">
          {dict.cta.callNow}
        </Button>
      </div>
    </>
  );
}
