import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Reveal } from "@/components/Reveal";
import { ContactForm } from "@/components/ContactForm";
import { site } from "@/lib/site";
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
  return pageMetadata(lang, "/contact", {
    title: dict.meta.contactTitle,
    description: dict.meta.contactDescription,
  });
}

export default async function ContactPage({ params }: LangParams) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <>
      <JsonLd
        data={breadcrumbGraph(lang, [
          { name: dict.nav.home, route: "" },
          { name: dict.nav.contact, route: "/contact" },
        ])}
      />
      <PageHeader title={dict.contact.heading} intro={dict.contact.intro} />

      <section className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
          {/* Left — primary contact details */}
          <Reveal>
            <div className="space-y-8">
              <div>
                <h2 className="text-base font-semibold text-tan">
                  {dict.labels.contact}
                </h2>
                <p className="mt-2 leading-relaxed text-mocha">
                  <a
                    href={`mailto:${site.contact.email}`}
                    className="hover:text-espresso"
                  >
                    {site.contact.email}
                  </a>
                  <br />
                  <a
                    href={site.contact.phoneHref}
                    className="hover:text-espresso"
                  >
                    {site.contact.phone}
                  </a>
                </p>
              </div>
              <div>
                <h2 className="text-base font-semibold text-tan">
                  {dict.labels.location}
                </h2>
                <p className="mt-2 leading-relaxed text-mocha">
                  {site.contact.landmark}
                  <br />
                  {site.contact.address.line1}
                  <br />
                  {site.contact.address.line2}
                </p>
              </div>
              <div>
                <p className="leading-relaxed text-mocha">
                  We have five studios across Greater Vancouver.{" "}
                  <a
                    href={`/${lang}/locations`}
                    className="font-semibold text-espresso hover:underline"
                  >
                    View all locations
                  </a>{" "}
                  for addresses, hours and directions.
                </p>
              </div>
            </div>
          </Reveal>

          {/* Right — contact form */}
          <Reveal delay={0.1}>
            <ContactForm dict={dict} />
          </Reveal>
        </div>
      </section>
    </>
  );
}
