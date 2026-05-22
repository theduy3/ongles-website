import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocument } from "@/components/LegalDocument";
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
  return pageMetadata(lang, "/terms", {
    title: dict.meta.termsTitle,
    description: dict.meta.termsDescription,
  });
}

export default async function TermsPage({ params }: LangParams) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <>
      <JsonLd
        data={breadcrumbGraph(lang, [
          { name: dict.nav.home, route: "" },
          { name: dict.nav.terms, route: "/terms" },
        ])}
      />
      <LegalDocument doc={dict.legal.terms} />
    </>
  );
}
