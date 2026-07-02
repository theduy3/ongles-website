import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AnswerBlock } from "@/components/AnswerBlock";
import { Button } from "@/components/Button";
import { JsonLd } from "@/components/JsonLd";
import { NearMeDetails } from "@/components/NearMeDetails";
import { getStoreConfig } from "@/lib/store-config";
import { buildServiceNames } from "@/lib/services";
import { getDictionary } from "../dictionaries";
import { getSeo } from "../seo-content";
import { getPageSeo } from "../page-seo";
import type { LangParams } from "@/lib/i18n";
import { requireLocale, resolveLocale } from "../locale-guard";

// No generateStaticParams — on-demand rendering via force-dynamic parent layout.
// No wrong-locale guard: /beauport serves both FR and EN for the ongles-maily
// tenant. The same borough slug is used in both locales (proper noun — P-04 plan note).

export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  const lang = await resolveLocale(params);
  if (!lang) return {};
  const seo = await getSeo(lang);
  const page = await getPageSeo(lang);
  return page.metadata("/beauport", {
    title: seo.pages.nearMe.metaTitle,
    description: seo.pages.nearMe.metaDescription,
    routeByLocale: { fr: "/beauport", en: "/beauport" },
  });
}

export default async function BeauportPage({ params }: LangParams) {
  const lang = await requireLocale(params);

  const dict = await getDictionary(lang);
  const seo = await getSeo(lang);
  const { site, locations, services } = await getStoreConfig();
  const page = await getPageSeo(lang);

  const bookHref = `/${lang}${site.booking}`;
  const location = locations[0];
  if (!location) notFound();

  // Service name map for NearMeDetails link labels (fail-loud on missing title).
  const serviceNames = buildServiceNames(services, dict.serviceDetails);

  return (
    <>
      {/* Breadcrumb JSON-LD: Home → Locations → Beauport */}
      <JsonLd
        data={page.breadcrumb([
          { name: dict.nav.home, route: "" },
          { name: dict.locations.heading, route: "/locations" },
          { name: seo.pages.nearMe.boroughName || "Beauport", route: "/beauport" },
        ])}
      />

      {/* Answer-first block — carries the single page h1 (D-19) */}
      <AnswerBlock
        heading={seo.pages.nearMe.answerHeading}
        text={seo.pages.nearMe.answerBlock}
      />

      {/* Local details panel: NAP + landmark + hours + service links */}
      <NearMeDetails
        lang={lang}
        location={location}
        site={site}
        services={services}
        serviceNames={serviceNames}
      />

      {/* CTA row */}
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 pb-16 sm:flex-row sm:justify-center md:pb-24">
        <Button href={bookHref} variant="solid">
          {dict.cta.book}
        </Button>
        <Button href={site.contact.phoneHref} variant="ghost">
          {dict.cta.callNow}
        </Button>
        <Button href={`/${lang}/locations`} variant="ghost">
          {dict.cta.viewServices ?? (lang === "fr" ? "Voir l'adresse" : "Find us")}
        </Button>
      </div>
    </>
  );
}
