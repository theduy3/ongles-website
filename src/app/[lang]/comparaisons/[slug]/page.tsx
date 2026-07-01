import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AnswerBlock } from "@/components/AnswerBlock";
import { Button } from "@/components/Button";
import { JsonLd } from "@/components/JsonLd";
import { getStoreConfig } from "@/lib/store-config";
import { services, servicePath } from "@/lib/services";
import {
  comparisonBySlug,
  comparisonPath,
  comparisonPathsByLocale,
} from "@/lib/comparisons";
import { getDictionary } from "../../dictionaries";
import { getSeo } from "../../seo-content";
import { getPageSeo } from "../../page-seo";
import { isLocale } from "@/lib/i18n";

type Params = { params: Promise<{ lang: string; slug: string }> };

// No generateStaticParams — comparison slugs resolve at request time against the
// runtime tenant (parent [lang] layout is force-dynamic). comparisonBySlug →
// notFound() handles unknown or wrong-locale slugs. /comparaisons is FR-only:
// an EN slug under this folder fails the FR slug lookup and 404s.

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang) || lang !== "fr") return {};
  const record = comparisonBySlug(lang, slug);
  if (!record) return {};
  const seo = await getSeo(lang);
  const page = await getPageSeo(lang);
  const c = seo.pages.comparison[record.id as keyof typeof seo.pages.comparison];
  if (!c) return {};
  return page.metadata(comparisonPath(record, lang), {
    title: c.metaTitle,
    description: c.metaDescription,
    routeByLocale: comparisonPathsByLocale(record),
  });
}

export default async function ComparisonPage({ params }: Params) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  // /comparaisons is the French comparison slug space only.
  if (lang !== "fr") notFound();
  const record = comparisonBySlug(lang, slug);
  if (!record) notFound();

  const dict = await getDictionary(lang);
  const seo = await getSeo(lang);
  const { site } = await getStoreConfig();
  const page = await getPageSeo(lang);
  const c = seo.pages.comparison[record.id as keyof typeof seo.pages.comparison];
  if (!c) notFound();
  const bookHref = `/${lang}${site.booking}`;

  // Cross-links (P-19): the real services this comparison weighs, plus pricing.
  const related = record.services
    .map((id) => services.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  return (
    <>
      <JsonLd
        data={page.breadcrumb([
          { name: dict.nav.home, route: "" },
          { name: dict.nav.services, route: "/services" },
          { name: c.answerHeading, route: comparisonPath(record, lang) },
        ])}
      />

      {/* Answer-first block — verdict-first, carries the single page h1 (D-19). */}
      <AnswerBlock heading={c.answerHeading} text={c.answerBlock} />

      {/* Decision section — "which should you choose?" + ≥200-word body. */}
      <section className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <h2 className="text-3xl text-espresso md:text-4xl">
          {dict.comparison.decisionHeading}
        </h2>
        <div className="mt-6 space-y-4 leading-relaxed text-mocha">
          {c.body
            .split(/\n\n+/)
            .map((para) => para.trim())
            .filter(Boolean)
            .map((para, i) => (
              <p key={i}>{para}</p>
            ))}
        </div>

        {related.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {related.map((service) => (
              <Link
                key={service.id}
                href={`/${lang}${servicePath(service, lang)}`}
                className="text-espresso underline-offset-4 hover:text-gold hover:underline"
              >
                {dict.serviceDetails[service.id].title}
              </Link>
            ))}
            <Link
              href={`/${lang}/tarifs`}
              className="text-espresso underline-offset-4 hover:text-gold hover:underline"
            >
              {dict.nav.pricing}
            </Link>
          </div>
        )}
      </section>

      {/* CTA row */}
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 pb-16 sm:flex-row sm:justify-center md:pb-24">
        <Button href={bookHref} variant="solid">
          {dict.cta.book}
        </Button>
        <Button href={site.contact.phoneHref} variant="ghost">
          {dict.cta.callNow}
        </Button>
      </div>
    </>
  );
}
