import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { JsonLd } from "@/components/JsonLd";
import { getDictionary } from "../dictionaries";
import { getSeo } from "../seo-content";
import { getPageSeo } from "../page-seo";
import type { LangParams } from "@/lib/i18n";
import { requireLocale, resolveLocale } from "../locale-guard";

export async function generateMetadata({
  params,
}: LangParams): Promise<Metadata> {
  const lang = await resolveLocale(params);
  if (!lang) return {};
  const seo = await getSeo(lang);
  const page = await getPageSeo(lang);
  return page.metadata("/terms", {
    title: seo.meta.termsTitle,
    description: seo.meta.termsDescription,
  });
}

export default async function TermsPage({ params }: LangParams) {
  const lang = await requireLocale(params);
  const dict = await getDictionary(lang);
  const page = await getPageSeo(lang);

  return (
    <>
      <JsonLd
        data={page.breadcrumb([
          { name: dict.nav.home, route: "" },
          { name: dict.nav.terms, route: "/terms" },
        ])}
      />
      <LegalDocument doc={dict.legal.terms} />
    </>
  );
}
