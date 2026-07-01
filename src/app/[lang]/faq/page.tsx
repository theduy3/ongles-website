import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type LangParams } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { getSeo } from "../seo-content";
import { getPageSeo } from "../page-seo";
import { getTenantFaq } from "../get-tenant-faq";
import { JsonLd } from "@/components/JsonLd";
import { PageHeader } from "@/components/PageHeader";
import { Accordion } from "@/components/Accordion";

export async function generateMetadata({
  params,
}: LangParams): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const seo = await getSeo(lang);
  const page = await getPageSeo(lang);
  return page.metadata("/faq", {
    title: seo.meta.faqTitle,
    description: seo.meta.faqDescription,
  });
}

export default async function FaqPage({ params }: LangParams) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const page = await getPageSeo(lang);
  // CONTENT-02 / F-01: render and emit the SAME intent-ordered base+tenant union
  // (de-tenanted shared base + this tenant's own facts) so mainEntity count
  // equals the rendered item count.
  const faqItems = await getTenantFaq(lang);

  return (
    <>
      <JsonLd data={page.faq(faqItems)} />
      <JsonLd
        data={page.breadcrumb([
          { name: dict.nav.home, route: "" },
          { name: dict.nav.faq, route: "/faq" },
        ])}
      />
      <PageHeader title={dict.faq.title} intro={dict.faq.intro} />
      <section className="mx-auto max-w-3xl px-6 py-20 md:py-28">
        <Accordion items={faqItems} />
      </section>
    </>
  );
}
