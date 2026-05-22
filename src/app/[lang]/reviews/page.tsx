import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type LangParams } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import { pageMetadata, breadcrumbGraph } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { PageHeader } from "@/components/PageHeader";
import { Stars } from "@/components/Stars";
import { Button } from "@/components/Button";
import { site } from "@/lib/site";
import { testimonials } from "@/data/testimonials";

export async function generateMetadata({
  params,
}: LangParams): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return pageMetadata(lang, "/reviews", {
    title: dict.meta.reviewsTitle,
    description: dict.meta.reviewsDescription,
  });
}

export default async function ReviewsPage({ params }: LangParams) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  const rating = site.reviews.ratingValue.toLocaleString("en-CA", {
    minimumFractionDigits: 1,
  });
  const count = site.reviews.reviewCount.toLocaleString("en-CA");

  return (
    <>
      <JsonLd
        data={breadcrumbGraph(lang, [
          { name: dict.nav.home, route: "" },
          { name: dict.nav.reviews, route: "/reviews" },
        ])}
      />
      <PageHeader
        title={dict.reviewsPage.title}
        intro={dict.reviewsPage.intro}
      />

      {/* Aggregate rating */}
      <section className="mx-auto max-w-3xl px-6 pt-16 text-center md:pt-24">
        <div
          className="flex flex-col items-center gap-2"
          aria-label={`${rating} / ${site.reviews.bestRating} — ${dict.reviews.basedOn} ${count} ${dict.reviews.reviewsWord}`}
        >
          <Stars className="text-espresso" />
          <p className="text-2xl font-semibold text-espresso">
            {rating}{" "}
            <span className="text-espresso/40">/ {site.reviews.bestRating}</span>
          </p>
          <p className="text-sm uppercase tracking-wide text-mocha">
            {dict.reviews.basedOn} {count} {dict.reviews.reviewsWord}
          </p>
        </div>
      </section>

      {/* Testimonial cards */}
      <section className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        {testimonials.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <figure
                key={t.author}
                className="flex h-full flex-col gap-4 rounded-2xl bg-fog p-6"
              >
                <div className="flex gap-1">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <span key={i} className="text-mocha" aria-hidden>
                      ★
                    </span>
                  ))}
                  <span className="sr-only">{t.rating} / 5</span>
                </div>
                <blockquote className="flex-1 leading-relaxed text-mocha">
                  {t.quote}
                </blockquote>
                <figcaption className="text-sm uppercase tracking-wide text-tan">
                  {t.author}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <p className="text-center text-mocha">{dict.reviewsPage.empty}</p>
        )}

        <div className="mt-12 text-center">
          <Button href={`/${lang}${site.booking}`}>
            {dict.reviewsPage.cta}
          </Button>
        </div>
      </section>
    </>
  );
}
