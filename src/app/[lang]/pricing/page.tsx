import type { Metadata } from "next";
import { AnswerBlock } from "@/components/AnswerBlock";
import { Button } from "@/components/Button";
import { JsonLd } from "@/components/JsonLd";
import { PricingTable } from "@/components/PricingTable";
import { getStoreConfig } from "@/lib/store-config";
import { buildPricingItems } from "@/lib/pricing";
import { pricingPath, pricingPathsByLocale } from "@/lib/routes";
import { getDictionary } from "../dictionaries";
import { getSeo } from "../seo-content";
import { getPageSeo } from "../page-seo";
import type { LangParams } from "@/lib/i18n";
import { requireLocale, resolveLocale } from "../locale-guard";

// No generateStaticParams — on-demand rendering via force-dynamic parent layout.
// Wrong-locale guard: /pricing is EN-only; non-en lang → 404.

export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  const lang = await resolveLocale(params, "en");
  if (!lang) return {};
  const seo = await getSeo(lang);
  const page = await getPageSeo(lang);
  return page.metadata(pricingPath(lang), {
    title: seo.pages.pricing.metaTitle,
    description: seo.pages.pricing.metaDescription,
    routeByLocale: pricingPathsByLocale(),
  });
}

export default async function PricingPage({ params }: LangParams) {
  const lang = await requireLocale(params, "en");

  const dict = await getDictionary(lang);
  const seo = await getSeo(lang);
  const { site, services } = await getStoreConfig();
  const page = await getPageSeo(lang);

  const bookHref = `/${lang}${site.booking}`;

  // Table rows + pricing JSON-LD items from one presenter, so a service's name
  // and price can't diverge between the visible table and the structured data.
  const { rows, graphItems } = buildPricingItems(
    lang,
    services,
    dict.serviceDetails,
    seo.services,
  );

  return (
    <>
      <JsonLd data={page.pricing(graphItems)} />
      <JsonLd
        data={page.breadcrumb([
          { name: dict.nav.home, route: "" },
          { name: dict.nav.pricing, route: pricingPath(lang) },
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
