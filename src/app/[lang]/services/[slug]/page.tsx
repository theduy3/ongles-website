import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Reveal } from "@/components/Reveal";
import { ServicePhoto } from "@/components/ServicePhoto";
import { JsonLd } from "@/components/JsonLd";
import { site } from "@/lib/site";
import {
  serviceBySlug,
  slugParams,
  servicePath,
  servicePathsByLocale,
} from "@/lib/services";
import { getDictionary } from "../../dictionaries";
import { isLocale } from "@/lib/i18n";
import {
  pageMetadata,
  serviceGraph,
  faqPageGraph,
  breadcrumbGraph,
} from "@/lib/seo";
import { formatFromPrice } from "@/lib/format";

type Params = { params: Promise<{ lang: string; slug: string }> };

// Emit only THIS locale's slugs. A wrong-locale slug (e.g. /fr/services/lash-extensions)
// is never generated → 404.
export function generateStaticParams({ params }: { params: { lang: string } }) {
  if (!isLocale(params.lang)) return [];
  return slugParams(params.lang);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const service = serviceBySlug(lang, slug);
  if (!service) return {};
  const d = (await getDictionary(lang)).serviceDetails[service.id];
  return pageMetadata(lang, servicePath(service, lang), {
    title: d.metaTitle,
    description: d.metaDescription,
    routeByLocale: servicePathsByLocale(service),
  });
}

export default async function ServiceDetailPage({ params }: Params) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const service = serviceBySlug(lang, slug);
  if (!service) notFound();

  const dict = await getDictionary(lang);
  const d = dict.serviceDetails[service.id];
  const labels = dict.serviceLabels;
  const bookHref = `/${lang}${site.booking}`;
  const priceDisplay = formatFromPrice(lang, service.price, labels.priceFrom);

  return (
    <>
      <JsonLd
        data={serviceGraph(lang, {
          name: d.title,
          description: d.metaDescription,
          price: service.price,
          priceTo: service.priceTo,
          path: servicePath(service, lang),
        })}
      />
      <JsonLd data={faqPageGraph(d.faq)} />
      <JsonLd
        data={breadcrumbGraph(lang, [
          { name: dict.nav.home, route: "" },
          { name: dict.nav.services, route: "/services" },
          { name: d.title, route: servicePath(service, lang) },
        ])}
      />

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
          <h1 className="mt-6 text-4xl text-espresso md:text-6xl">{d.title}</h1>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="relative mx-auto mt-10 aspect-[16/9] w-full overflow-hidden rounded-2xl">
            <ServicePhoto
              id={service.id}
              photo={service.photo}
              alt={d.heroAlt}
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
