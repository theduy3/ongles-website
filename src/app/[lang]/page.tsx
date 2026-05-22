import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/Button";
import { Reveal } from "@/components/Reveal";
import { Gallery } from "@/components/Gallery";
import { Stars } from "@/components/Stars";
import { Testimonials } from "@/components/Testimonials";
import { WhyChooseUs } from "@/components/WhyChooseUs";
import { GiftCards } from "@/components/GiftCards";
import { LocationsSection } from "@/components/LocationsSection";
import { galleryImages } from "@/lib/gallery";
import { site } from "@/lib/site";
import { getDictionary } from "./dictionaries";
import { isLocale, type LangParams } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

// Marketing service-card images live under /images/home (separate from the
// service-detail photos). Order matches dict.home.serviceCards.
const CARD_IMAGES = [
  "/images/home/gel-manicure.png",
  "/images/home/acrylic-full-set.png",
  "/images/home/nail-art.png",
  "/images/home/spa-pedicure.png",
];

export async function generateMetadata({
  params,
}: LangParams): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return pageMetadata(lang, "", {
    title: dict.meta.homeTitle,
    description: dict.meta.homeDescription,
  });
}

export default async function Home({ params }: LangParams) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  const ratingDisplay = site.reviews.ratingValue.toLocaleString("en-CA", {
    minimumFractionDigits: 1,
  });
  const reviewCountDisplay = site.reviews.reviewCount.toLocaleString("en-CA");

  const gallerySlides = galleryImages.map((img) => ({
    id: img.id,
    file: img.file,
    alt: dict.gallery.photos[img.id as keyof typeof dict.gallery.photos].alt,
    caption:
      dict.gallery.photos[img.id as keyof typeof dict.gallery.photos].caption,
  }));

  return (
    <>
      {/* Hero */}
      <section>
        <div className="mx-auto max-w-7xl px-6 py-20 text-center md:py-28">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.25em] text-mocha">
              {dict.hero.subtitle}
            </p>
            <h1 className="mx-auto mt-6 max-w-4xl text-4xl leading-tight text-espresso sm:text-5xl md:text-6xl">
              {dict.hero.taglineLead}{" "}
              <em className="font-normal not-italic text-mocha">
                {dict.hero.taglineEmphasis}
              </em>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl leading-relaxed text-mocha">
              {dict.hero.description}
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button href={`/${lang}${site.booking}`}>{dict.cta.book}</Button>
              <Button href={`/${lang}/locations`} variant="outline">
                {dict.cta.callNow}
              </Button>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="relative mx-auto mt-14 aspect-[16/9] w-full max-w-5xl overflow-hidden rounded-3xl">
              <Image
                src="/images/hero.png"
                alt={dict.hero.alt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 1024px"
                className="object-cover"
              />
            </div>
          </Reveal>
          <Reveal delay={0.2}>
            <dl className="mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-6">
              {dict.hero.badges.map((b) => (
                <div key={b.label}>
                  <dt className="text-2xl text-espresso md:text-3xl">{b.value}</dt>
                  <dd className="mt-1 text-xs uppercase tracking-wide text-mocha">
                    {b.label}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {/* Services — 4 marketing cards */}
      <section id="services" className="scroll-mt-24 bg-fog">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <p className="text-xs uppercase tracking-[0.2em] text-mocha">
                {dict.home.servicesEyebrow}
              </p>
              <h2 className="mt-3 text-3xl text-espresso md:text-5xl">
                {dict.home.servicesHeading}
              </h2>
              <p className="mt-5 leading-relaxed text-mocha">
                {dict.home.servicesIntro}
              </p>
            </Reveal>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {dict.home.serviceCards.map((card, i) => (
              <Reveal key={card.title} delay={i * 0.08}>
                <article className="flex flex-col overflow-hidden rounded-2xl bg-beige shadow-sm">
                  <div className="relative aspect-[4/3] w-full bg-tan/30">
                    <Image
                      src={CARD_IMAGES[i]}
                      alt={card.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-xl text-espresso">{card.title}</h3>
                      <span className="text-sm font-semibold text-mocha">
                        {card.price}
                      </span>
                    </div>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-mocha">
                      {card.body}
                    </p>
                    <div className="mt-6">
                      <Button
                        href={`/${lang}${site.booking}`}
                        variant="outline"
                        className="w-full"
                      >
                        {dict.cta.bookNow}
                      </Button>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <div className="mt-12 text-center">
              <Button href={`/${lang}/services`}>{dict.cta.services}</Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Why choose us */}
      <WhyChooseUs dict={dict} />

      {/* Gallery */}
      <section id="gallery" className="scroll-mt-24">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <p className="text-xs uppercase tracking-[0.2em] text-mocha">
                {dict.home.galleryEyebrow}
              </p>
              <h2 className="mt-3 text-3xl text-espresso md:text-5xl">
                {dict.home.galleryHeading}
              </h2>
              <p className="mt-5 leading-relaxed text-mocha">
                {dict.home.galleryIntro}
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <div className="mt-12">
              <Gallery slides={gallerySlides} />
            </div>
          </Reveal>
          <Reveal>
            <div className="mt-12 text-center">
              <Button href={`/${lang}/gallery`} variant="outline">
                {dict.cta.seeMore}
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Reviews / testimonials */}
      <section className="bg-fog">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center md:py-28">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.2em] text-mocha">
              {dict.reviews.eyebrow}
            </p>
            <h2 className="mt-3 text-3xl text-espresso md:text-5xl">
              {dict.reviews.headlineMain}
            </h2>
          </Reveal>
          <Reveal delay={0.05}>
            <div
              className="mt-8 flex flex-col items-center gap-2"
              aria-label={`${ratingDisplay} / ${site.reviews.bestRating} — ${dict.reviews.basedOn} ${reviewCountDisplay} ${dict.reviews.reviewsWord}`}
            >
              <Stars className="text-espresso" />
              <p className="text-2xl font-semibold text-espresso">
                {ratingDisplay}{" "}
                <span className="text-espresso/40">/ {site.reviews.bestRating}</span>
              </p>
              <p className="text-sm uppercase tracking-wide text-mocha">
                {dict.reviews.basedOn} {reviewCountDisplay} {dict.reviews.reviewsWord}
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <Testimonials />
          </Reveal>
        </div>
      </section>

      {/* Gift cards */}
      <GiftCards dict={dict} />

      {/* Booking CTA */}
      <section id="booking" className="scroll-mt-24 bg-espresso text-cream">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center md:py-28">
          <Reveal>
            <h2 className="text-3xl text-cream md:text-5xl">
              {dict.home.bookingHeading}
            </h2>
            <p className="mt-5 leading-relaxed text-cream/80">
              {dict.home.bookingIntro}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button href={`/${lang}${site.booking}`} variant="light">
                {dict.cta.book}
              </Button>
              <Button href={`/${lang}/locations`} variant="outline" className="text-cream">
                {dict.cta.callNow}
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Locations */}
      <LocationsSection dict={dict} locale={lang} />
    </>
  );
}
