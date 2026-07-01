import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocument } from "@/components/LegalDocument";
import { JsonLd } from "@/components/JsonLd";
import { getDictionary } from "../dictionaries";
import { getSeo } from "../seo-content";
import { isLocale, type LangParams } from "@/lib/i18n";
import { pageMetadata, breadcrumbGraph } from "@/lib/seo";
import { getStoreConfig } from "@/lib/store-config";

export async function generateMetadata({
  params,
}: LangParams): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const seo = await getSeo(lang);
  const { site, locations } = await getStoreConfig();
  return pageMetadata(lang, "/terms", {
    title: seo.meta.termsTitle,
    description: seo.meta.termsDescription,
  }, { site, locations });
}

export default async function TermsPage({ params }: LangParams) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const { site, locations } = await getStoreConfig();

  return (
    <>
      <JsonLd
        data={breadcrumbGraph(lang, [
          { name: dict.nav.home, route: "" },
          { name: dict.nav.terms, route: "/terms" },
        ], { site, locations })}
      />
      <LegalDocument doc={dict.legal.terms} />
    </>
  );
}
