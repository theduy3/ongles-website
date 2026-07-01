import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AnswerBlock } from "@/components/AnswerBlock";
import { Button } from "@/components/Button";
import { Reveal } from "@/components/Reveal";
import { ServicePhoto } from "@/components/ServicePhoto";
import { JsonLd } from "@/components/JsonLd";
import { Stars } from "@/components/Stars";
import { getStoreConfig } from "@/lib/store-config";
import {
  serviceBySlug,
  servicePath,
  servicePathsByLocale,
} from "@/lib/services";
import { getDictionary } from "../../dictionaries";
import { getSeo } from "../../seo-content";
import { getPageSeo } from "../../page-seo";
import { isLocale } from "@/lib/i18n";
import { formatFromPrice } from "@/lib/format";
import { trustSignals } from "@/lib/reviews";
import { navHref } from "@/lib/nav";

type Params = { params: Promise<{ lang: string; slug: string }> };

// No generateStaticParams: service slugs come from the runtime tenant's catalog, so
// pages render on demand (parent [lang] layout is force-dynamic). serviceBySlug →
// notFound() handles unknown or wrong-locale slugs at request time.

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const service = serviceBySlug(lang, slug);
  if (!service) return {};
  const s = (await getSeo(lang)).services[service.id];
  const page = await getPageSeo(lang);
  return page.metadata(servicePath(service, lang), {
    title: s.metaTitle,
    description: s.metaDescription,
    routeByLocale: servicePathsByLocale(service),
  });
}

export default async function ServiceDetailPage({ params }: Params) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const service = serviceBySlug(lang, slug);
  if (!service) notFound();

  const dict = await getDictionary(lang);
  const seo = await getSeo(lang);
  const { site } = await getStoreConfig();
  const page = await getPageSeo(lang);
  const d = dict.serviceDetails[service.id];
  const s = seo.services[service.id];
  const labels = dict.serviceLabels;
  const bookHref = `/${lang}${site.booking}`;
  const priceDisplay = formatFromPrice(lang, service.price, labels.priceFrom);
  const pricingHref = navHref(lang, site.nav, "pricing", "/tarifs");
  const trust = trustSignals(lang, site.reviews, dict.reviews);

  return (
    <>
      <JsonLd
        data={page.service({
          name: d.title,
          description: s.schemaDescription,
          price: service.price,
          priceTo: service.priceTo,
          path: servicePath(service, lang),
        })}
      />
      <JsonLd data={page.faq(d.faq)} />
      <JsonLd
        data={page.breadcrumb([
          { name: dict.nav.home, route: "" },
          { name: dict.nav.services, route: "/services" },
          { name: d.title, route: servicePath(service, lang) },
        ])}
      />

      {/* Direct-answer block — first in main, carries the single page h1 (CONTENT-01, D-17/D-19) */}
      <AnswerBlock heading={s.answerHeading} text={s.answerBlock} />

      {/* Hero: back link + title + image */}
      <section className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <Reveal>
          <Link
            href={`/${lang}/services`}
            className="text-sm uppercase tracking-widest text-mocha hover:text-espresso"
          >
            ← {labels.allServices}
          </Link>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-6 text-4xl text-espresso md:text-6xl">{d.title}</h2>
        </Reveal>
        <Reveal delay={0.08}>
          {/* CONV-02 above-fold trust signals: price-from anchor → pricing route, R-02-gated rating */}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href={pricingHref}
              className="text-sm font-medium uppercase tracking-wide text-espresso underline-offset-4 hover:underline"
            >
              {priceDisplay}
            </Link>
            {trust.show && (
              <span
                className="flex items-center gap-2"
                aria-label={trust.ariaLabel}
              >
                <Stars className="text-gold" />
                <span className="text-sm text-mocha">
                  {trust.ratingDisplay} / {trust.bestRating}
                </span>
              </span>
            )}
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="relative mx-auto mt-10 aspect-[16/9] w-full overflow-hidden rounded-2xl">
            <ServicePhoto
              id={service.id}
              photo={service.photo}
              alt={s.heroAlt}
              label={d.title}
              sizes="(max-width: 768px) 100vw, 1024px"
              className="h-full w-full"
            />
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-10 max-w-3xl space-y-5 text-lg leading-relaxed text-mocha">
            {d.intro.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Why choose us */}
      <section className="mx-auto max-w-3xl px-6 pb-4">
        <Reveal>
          <h2 className="text-2xl text-espresso md:text-3xl">{labels.why}</h2>
          <p className="mt-6 leading-relaxed text-mocha">{d.whyUs}</p>
        </Reveal>
      </section>

      {/* What's included + add-ons + price + duration */}
      <section className="bg-fog">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
          <Reveal>
            <h2 className="text-2xl text-espresso md:text-3xl">
              {labels.included}
            </h2>
            <ul className="mt-6 space-y-3 text-mocha">
              {d.included.map((item) => (
                <li key={item} className="flex gap-3 leading-relaxed">
                  <span aria-hidden className="text-tan">
                    —
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="text-2xl text-espresso md:text-3xl">
              {labels.addons}
            </h2>
            <ul className="mt-6 space-y-3 text-mocha">
              {d.addons.map((item) => (
                <li key={item} className="flex gap-3 leading-relaxed">
                  <span aria-hidden className="text-tan">
                    +
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <dl className="mt-10 space-y-4">
              <div>
                <dt className="text-sm uppercase tracking-wide text-mocha">
                  {labels.price}
                </dt>
                <dd className="mt-1 text-lg font-semibold text-espresso">
                  {priceDisplay}
                </dd>
              </div>
              <div>
                <dt className="text-sm uppercase tracking-wide text-mocha">
                  {labels.duration}
                </dt>
                <dd className="mt-1 leading-relaxed text-mocha">
                  {d.duration}
                </dd>
              </div>
            </dl>
          </Reveal>
        </div>
      </section>

      {/* Aftercare */}
      <section className="mx-auto max-w-3xl px-6 pt-16 md:pt-24">
        <Reveal>
          <h2 className="text-2xl text-espresso md:text-3xl">
            {labels.aftercare}
          </h2>
          <p className="mt-6 leading-relaxed text-mocha">{d.aftercare}</p>
        </Reveal>
      </section>

      {/* Hygiene & safety */}
      <section className="mx-auto max-w-3xl px-6 pb-16 pt-12 md:pb-24 md:pt-16">
        <Reveal>
          <h2 className="text-2xl text-espresso md:text-3xl">
            {labels.hygiene}
          </h2>
          <p className="mt-6 leading-relaxed text-mocha">{d.hygiene}</p>
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="bg-fog">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
          <Reveal>
            <h2 className="text-2xl text-espresso md:text-3xl">{labels.faq}</h2>
          </Reveal>
          <dl className="mt-8 space-y-8">
            {d.faq.map((item) => (
              <Reveal key={item.q}>
                <dt className="text-lg font-semibold text-espresso">
                  {item.q}
                </dt>
                <dd className="mt-2 leading-relaxed text-mocha">{item.a}</dd>
              </Reveal>
            ))}
          </dl>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 py-16 text-center md:py-24">
        <Reveal>
          <p className="text-lg text-mocha">{dict.reviews.ctaPrompt}</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button href={bookHref}>{dict.cta.book}</Button>
            <a
              href={site.contact.phoneHref}
              className="font-semibold text-espresso transition-colors hover:text-mocha"
            >
              {site.contact.phone}
            </a>
          </div>
        </Reveal>
      </section>
    </>
  );
}
