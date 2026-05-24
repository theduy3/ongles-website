import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Reveal } from "@/components/Reveal";
import { JsonLd } from "@/components/JsonLd";
import { BookingWidget } from "@/components/BookingWidget";
import { site } from "@/lib/site";
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

      <section className="mx-auto max-w-5xl px-6 pt-16 md:pt-20">
        <Reveal>
          <h2 className="text-center text-3xl text-espresso md:text-4xl">
            {dict.bookOnline.howTitle}
          </h2>
        </Reveal>
        <ol className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {dict.bookOnline.steps.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.07}>
              <li className="text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-espresso text-cream">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-espresso">
                  {step.title}
                </h3>
                <p className="mt-2 leading-relaxed text-mocha">{step.body}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        {/* Embedded SalonX booking wizard (store OM, app.onglesmaily.com). */}
        <BookingWidget locale={lang} />

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

        <Reveal>
          <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed text-mocha/80">
            {dict.bookOnline.note}
          </p>
        </Reveal>
      </section>
    </>
  );
}
