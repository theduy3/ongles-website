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
  return pageMetadata(lang, "/privacy", {
    title: seo.meta.privacyTitle,
    description: seo.meta.privacyDescription,
  }, { site, locations });
}

export default async function PrivacyPage({ params }: LangParams) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const { site, locations } = await getStoreConfig();

  return (
    <>
      <JsonLd
        data={breadcrumbGraph(lang, [
          { name: dict.nav.home, route: "" },
          { name: dict.nav.privacy, route: "/privacy" },
        ], { site, locations })}
      />
      <LegalDocument doc={dict.legal.privacy} />
    </>
  );
}
