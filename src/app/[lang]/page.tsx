import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AnswerBlock } from "@/components/AnswerBlock";
import { Button } from "@/components/Button";
import { Reveal } from "@/components/Reveal";
import { Gallery } from "@/components/Gallery";
import { Stars } from "@/components/Stars";
import { Testimonials } from "@/components/Testimonials";
import { WhyChooseUs } from "@/components/WhyChooseUs";
import { GiftCards } from "@/components/GiftCards";
import { LocationsSection } from "@/components/LocationsSection";
import { buildGallerySlides } from "@/lib/gallery";
import { formatFromPrice } from "@/lib/format";
import { trustSignals } from "@/lib/reviews";
import { navHref } from "@/lib/nav";
import { services } from "@/lib/services";
import { getStoreConfig } from "@/lib/store-config";
import { buildSalonCards } from "@/components/SalonCard";
import { getDictionary } from "./dictionaries";
import { getSeo } from "./seo-content";
import { getPageSeo } from "./page-seo";
import type { LangParams } from "@/lib/i18n";
import { requireLocale, resolveLocale } from "./locale-guard";

// Marketing service-card images — order matches serviceCards: Nail Enhancements, Fill, Manicure, Pedicure.
const CARD_IMAGES = [
  "/images/home/acrylic-full-set.webp",
  "/images/home/nail-art.webp",
  "/images/home/gel-manicure.webp",
  "/images/home/spa-pedicure.webp",
];

// Small inline icons for the hero CTAs.
function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
      aria-hidden
    >
      <path
        d="M5 12h14M13 6l6 6-6 6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M6.62 10.79a15.46 15.46 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.24.2 2.45.57 3.57a1 1 0 01-.24 1.02l-2.21 2.2z" />
    </svg>
  );
}

export async function generateMetadata({
  params,
}: LangParams): Promise<Metadata> {
  const lang = await resolveLocale(params);
  if (!lang) return {};
  const seo = await getSeo(lang);
  const page = await getPageSeo(lang);
  return page.metadata("", {
    title: seo.meta.homeTitle,
    description: seo.meta.homeDescription,
  });
}

export default async function Home({ params }: LangParams) {
  const lang = await requireLocale(params);
  const dict = await getDictionary(lang);
  const seo = await getSeo(lang);
  const { site, locations } = await getStoreConfig();
  const salonCards = buildSalonCards(dict, lang, site, locations);

  const trust = trustSignals(lang, site.reviews, dict.reviews);

  // CONV-02 above-fold trust signals: catalog entry price + localized pricing route.
  const fromPrice = Math.min(...services.map((s) => s.price));
  const priceFromDisplay = formatFromPrice(
    lang,
    fromPrice,
    dict.serviceLabels.priceFrom,
  );
  const pricingHref = navHref(lang, site.nav, "pricing", "/tarifs");

  const gallerySlides = buildGallerySlides(seo, dict);

  return (
    <>
      {/* Direct-answer block — first in main, carries the single page h1 (CONTENT-01, D-17/D-19) */}
      <AnswerBlock
        heading={seo.meta.homeAnswerHeading}
        text={seo.meta.homeAnswerBlock}
        compact
      />

      {/* Hero — two-column (text left, image + floating stats right) */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-gold">
                {dict.hero.subtitle}
              </p>
              <h2 className="mt-6 max-w-xl text-5xl leading-[1.05] text-espresso md:text-6xl">
                {dict.hero.taglineLead}{" "}
                <em className="italic text-mocha">
                  {dict.hero.taglineEmphasis}
                </em>
              </h2>
              <p className="mt-6 max-w-md text-lg font-light leading-relaxed text-mocha">
                {dict.hero.description}
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Button href={`/${lang}${site.booking}`}>
                  {dict.cta.book}
                  <ArrowIcon />
                </Button>
                <Button href={site.contact.phoneHref} variant="ghost">
                  <PhoneIcon />
                  {dict.cta.callNow}
                </Button>
              </div>
              {/* CONV-02 above-fold trust signals: price-from anchor → pricing route, R-02-gated rating */}
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Link
                  href={pricingHref}
                  className="text-sm font-medium uppercase tracking-wide text-espresso underline-offset-4 hover:underline"
                >
                  {priceFromDisplay}
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
              <dl className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
                {dict.hero.badges.map((b, i) => (
                  <div
                    key={b.label}
                    className={`flex flex-col ${i > 0 ? "border-l border-espresso/15 pl-8" : ""}`}
                  >
                    <dt className="text-2xl text-espresso">{b.value}</dt>
                    <dd className="text-xs uppercase tracking-wide text-mocha">
                      {b.label}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="relative mx-auto w-full max-w-md">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl shadow-card">
                <Image
                  src="/images/hero.webp"
                  alt={dict.hero.alt}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 448px"
                  className="object-cover"
                />
              </div>
              {/* Floating stat cards */}
              <div className="absolute -left-4 top-8 rounded-2xl bg-white px-5 py-3 shadow-card">
                <p className="text-lg font-semibold text-espresso">
                  {dict.hero.stats[0].value}
                </p>
                <p className="text-xs uppercase tracking-wide text-mocha">
                  {dict.hero.stats[0].label}
                </p>
              </div>
              <div className="absolute -right-4 bottom-8 rounded-2xl bg-white px-5 py-3 shadow-card">
                <p className="text-lg font-semibold text-espresso">
                  {dict.hero.stats[1].value}
                </p>
                <p className="text-xs uppercase tracking-wide text-mocha">
                  {dict.hero.stats[1].label}
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Services — 4 white cards */}
      <section id="services" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <p className="text-xs uppercase tracking-[0.2em] text-gold">
                {dict.home.servicesEyebrow}
              </p>
              <h2 className="mt-3 text-4xl text-espresso md:text-5xl">
                {dict.home.servicesHeading}
              </h2>
              <p className="mt-5 font-light leading-relaxed text-mocha">
                {dict.home.servicesIntro}
              </p>
            </Reveal>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {dict.home.serviceCards.map((card, i) => (
              <Reveal key={card.title} delay={i * 0.08}>
                <article className="flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-card">
                  <div className="relative aspect-[4/3] w-full">
                    <Image
                      src={CARD_IMAGES[i]}
                      alt={card.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-xl text-espresso">{card.title}</h3>
                    <p className="mt-1 text-sm font-medium text-gold">
                      {card.price}
                    </p>
                    <p className="mt-3 flex-1 text-sm font-light leading-relaxed text-mocha">
                      {card.body}
                    </p>
                    <div className="mt-5">
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
        </div>
      </section>

      {/* Why choose us */}
      <WhyChooseUs dict={dict} />

      {/* Gallery */}
      <section id="gallery" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <p className="text-xs uppercase tracking-[0.2em] text-gold">
                {dict.home.galleryEyebrow}
              </p>
              <h2 className="mt-3 text-4xl text-espresso md:text-5xl">
                {dict.home.galleryHeading}
              </h2>
              <p className="mt-5 font-light leading-relaxed text-mocha">
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
              <Button href={`/${lang}/gallery`} variant="ghost">
                {dict.cta.seeMore}
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Reviews / testimonials — white band */}
      <section id="testimonials" className="scroll-mt-20 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <p className="text-xs uppercase tracking-[0.2em] text-gold">
                {dict.reviews.eyebrow}
              </p>
              <h2 className="mt-3 text-4xl text-espresso md:text-5xl">
                {dict.reviews.headlineMain}
              </h2>
            </Reveal>
            {trust.show && (
              <Reveal delay={0.05}>
                <div
                  className="mt-6 flex flex-col items-center gap-2"
                  aria-label={trust.ariaLabel}
                >
                  <Stars className="text-gold" />
                  <p className="text-sm uppercase tracking-wide text-mocha">
                    {trust.ratingDisplay} / {trust.bestRating} ·{" "}
                    {dict.reviews.basedOn} {trust.countDisplay}{" "}
                    {dict.reviews.reviewsWord}
                  </p>
                </div>
              </Reveal>
            )}
          </div>
          <div className="mt-12">
            <Testimonials dict={dict} />
          </div>
        </div>
      </section>

      {/* Gift cards */}
      <GiftCards dict={dict} />

      {/* Booking CTA — light band */}
      <section id="booking" className="scroll-mt-20 bg-sand">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center md:py-24">
          <Reveal>
            <h2 className="text-4xl text-espresso md:text-5xl">
              {dict.home.bookingHeading}
            </h2>
            <p className="mx-auto mt-5 max-w-xl font-light leading-relaxed text-mocha">
              {dict.home.bookingIntro}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button href={`/${lang}${site.booking}`}>
                {dict.cta.book}
                <ArrowIcon />
              </Button>
              <Button href={site.contact.phoneHref} variant="ghost">
                <PhoneIcon />
                {dict.cta.callNow}
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Locations */}
      <LocationsSection dict={dict} locale={lang} cards={salonCards} />
    </>
  );
}
