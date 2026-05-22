import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Reveal } from "@/components/Reveal";
import { JsonLd } from "@/components/JsonLd";
import { site } from "@/lib/site";
import { locations, bookerServiceMenu } from "@/lib/locations";
import { getDictionary } from "../dictionaries";
import { isLocale, type LangParams } from "@/lib/i18n";
import { pageMetadata, breadcrumbGraph } from "@/lib/seo";

export async function generateMetadata({
  params,
}: LangParams): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return pageMetadata(lang, "/book-online", {
    title: dict.meta.bookOnlineTitle,
    description: dict.meta.bookOnlineDescription,
  });
}

export default async function BookOnlinePage({ params }: LangParams) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <>
      <JsonLd
        data={breadcrumbGraph(lang, [
          { name: dict.nav.home, route: "" },
          { name: dict.nav.bookOnline, route: "/book-online" },
        ])}
      />
      <PageHeader
        title={dict.bookOnline.heading}
        intro={dict.bookOnline.intro}
      />

      <section className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        {/* Per-location booking cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((loc, i) => (
            <Reveal key={loc.id} delay={i * 0.07}>
              <div className="flex flex-col gap-4 rounded-2xl border border-fog bg-beige p-6 shadow-sm">
                <div>
                  <h2 className="text-xl text-espresso">{loc.name}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-mocha">
                    {loc.address.line1}
                    <br />
                    {loc.address.line2}
                  </p>
                </div>
                <div className="mt-auto">
                  <Button href={bookerServiceMenu(loc)} className="w-full">
                    {dict.locations.bookNow}
                  </Button>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Brand hub CTA */}
        <Reveal>
          <div className="mt-12 text-center">
            <Button href={site.booker.brand} variant="outline">
              {dict.cta.book}
            </Button>
          </div>
        </Reveal>

        {/* Help line */}
        <Reveal>
          <p className="mt-10 text-center leading-relaxed text-mocha">
            {dict.bookOnline.helpBefore}
            <a
              href={site.contact.phoneHref}
              className="font-semibold text-espresso hover:underline"
            >
              {site.contact.phone}
            </a>
            {dict.bookOnline.helpAfter}
          </p>
        </Reveal>
      </section>
    </>
  );
}
