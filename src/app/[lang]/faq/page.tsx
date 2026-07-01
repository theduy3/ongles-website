import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type LangParams } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { getSeo } from "../seo-content";
import { getTenantFaq } from "../get-tenant-faq";
import { pageMetadata, faqPageGraph, breadcrumbGraph } from "@/lib/seo";
import { getStoreConfig } from "@/lib/store-config";
import { JsonLd } from "@/components/JsonLd";
import { PageHeader } from "@/components/PageHeader";
import { Accordion } from "@/components/Accordion";

export async function generateMetadata({
  params,
}: LangParams): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const seo = await getSeo(lang);
  const { site, locations } = await getStoreConfig();
  return pageMetadata(lang, "/faq", {
    title: seo.meta.faqTitle,
    description: seo.meta.faqDescription,
  }, { site, locations });
}

export default async function FaqPage({ params }: LangParams) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const { site, locations } = await getStoreConfig();
  // CONTENT-02 / F-01: render and emit the SAME intent-ordered base+tenant union
  // (de-tenanted shared base + this tenant's own facts) so mainEntity count
  // equals the rendered item count.
  const faqItems = await getTenantFaq(lang);

  return (
    <>
      <JsonLd data={faqPageGraph(faqItems)} />
      <JsonLd
        data={breadcrumbGraph(lang, [
          { name: dict.nav.home, route: "" },
          { name: dict.nav.faq, route: "/faq" },
        ], { site, locations })}
      />
      <PageHeader title={dict.faq.title} intro={dict.faq.intro} />
      <section className="mx-auto max-w-3xl px-6 py-20 md:py-28">
        <Accordion items={faqItems} />
      </section>
    </>
  );
}
