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

// Marketing service-card images. The order matches the service cards in the
// locale dictionaries.
const CARD_IMAGES = [
  "/images/home/acrylic-full-set.webp",
  "/images/home/nail-art.webp",
  "/images/home/gel-manicure.webp",
  "/images/home/spa-pedicure.webp",
];

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
      {/* Hero: the copy stays first on mobile, while the visual follows quickly. */}
      <section className="border-b border-espresso/10">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-5 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] lg:gap-16 lg:px-8 lg:py-20 xl:gap-20">
          <Reveal>
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.25em] text-gold sm:text-xs">
                {dict.hero.subtitle}
              </p>
              <h1 className="mt-4 text-[clamp(2.7rem,11vw,5rem)] leading-[0.96] text-espresso lg:text-[clamp(3.5rem,5.2vw,5rem)]">
                {dict.hero.taglineLead}{" "}
                <em className="pb-1 italic leading-[1.1] text-mocha">
                  {dict.hero.taglineEmphasis}
                </em>
              </h1>
              <p className="mt-5 max-w-lg text-base font-light leading-relaxed text-mocha sm:text-lg">
                {dict.hero.description}
              </p>
              <div className="mt-7 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
                <Button
                  href={`/${lang}${site.booking}`}
                  className="w-full sm:w-auto"
                >
                  {dict.cta.book}
                  <ArrowIcon />
                </Button>
                <Button
                  href={site.contact.phoneHref}
                  variant="ghost"
                  className="w-full sm:w-auto"
                >
                  <PhoneIcon />
                  {dict.cta.callNow}
                </Button>
              </div>
              {/* CONV-02: price anchor + R-02-gated rating. */}
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
                <Link
                  href={pricingHref}
                  className="text-xs font-medium uppercase tracking-[0.12em] text-espresso underline-offset-4 hover:underline sm:text-sm"
                >
                  {priceFromDisplay}
                </Link>
                {trust.show && (
                  <span
                    className="flex items-center gap-2"
                    aria-label={trust.ariaLabel}
                  >
                    <Stars className="text-gold [&>svg]:h-4 [&>svg]:w-4" />
                    <span className="text-xs text-mocha sm:text-sm">
                      {trust.ratingDisplay} / {trust.bestRating}
                    </span>
                  </span>
                )}
              </div>
              <dl className="mt-7 grid max-w-xl grid-cols-3 border-y border-espresso/15 py-4 lg:mt-9">
                {dict.hero.badges.map((b, i) => (
                  <div
                    key={b.label}
                    className={`min-w-0 pr-3 ${i > 0 ? "border-l border-espresso/15 pl-3 sm:pl-5" : ""}`}
                  >
                    <dt className="text-xl text-espresso sm:text-2xl">{b.value}</dt>
                    <dd className="mt-1 max-w-[10rem] text-[0.6rem] uppercase leading-snug tracking-[0.1em] text-mocha sm:text-xs">
                      {b.label}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="relative mx-auto w-full max-w-[34rem] lg:max-w-none">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-card sm:aspect-[4/5]">
                <Image
                  src="/images/hero.webp"
                  alt={dict.hero.alt}
                  fill
                  priority
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 52vw"
                  className="object-cover"
                />
              </div>
              <div className="absolute left-3 top-3 rounded-xl bg-white px-3 py-2 shadow-card sm:-left-5 sm:top-8 sm:rounded-2xl sm:px-5 sm:py-3">
                <p className="text-base font-semibold text-espresso sm:text-lg">
                  {dict.hero.stats[0].value}
                </p>
                <p className="text-[0.6rem] uppercase tracking-wide text-mocha sm:text-xs">
                  {dict.hero.stats[0].label}
                </p>
              </div>
              <div className="absolute bottom-3 right-3 rounded-xl bg-white px-3 py-2 shadow-card sm:-right-5 sm:bottom-8 sm:rounded-2xl sm:px-5 sm:py-3">
                <p className="text-base font-semibold text-espresso sm:text-lg">
                  {dict.hero.stats[1].value}
                </p>
                <p className="text-[0.6rem] uppercase tracking-wide text-mocha sm:text-xs">
                  {dict.hero.stats[1].label}
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Direct-answer block: visible local context before the service catalog. */}
      <AnswerBlock
        heading={seo.meta.homeAnswerHeading}
        text={seo.meta.homeAnswerBlock}
        compact
        headingLevel="h2"
      />

      {/* Services: one lead service and three supporting choices. */}
      <section id="services" className="scroll-mt-20">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 md:py-24 lg:px-8">
          <div className="max-w-2xl">
            <Reveal>
              <h2 className="max-w-xl text-4xl text-espresso sm:text-5xl">
                {dict.home.servicesHeading}
              </h2>
              <p className="mt-5 max-w-xl font-light leading-relaxed text-mocha">
                {dict.home.servicesIntro}
              </p>
            </Reveal>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
            {dict.home.serviceCards.map((card, i) => (
              <Reveal key={card.title} delay={i * 0.08}>
                <article
                  className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-espresso/10 bg-white shadow-card transition-transform duration-300 hover:-translate-y-1 ${i === 0 ? "md:row-span-2" : ""} ${i === 3 ? "md:col-span-2 md:grid md:grid-cols-2" : ""}`}
                >
                  <div
                    className={`relative w-full overflow-hidden ${i === 3 ? "aspect-[4/3] md:aspect-auto md:min-h-[13rem]" : "aspect-[4/3]"}`}
                  >
                    <Image
                      src={CARD_IMAGES[i]}
                      alt={card.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <h3 className="text-2xl text-espresso">{card.title}</h3>
                    <p className="mt-1 text-sm font-medium text-gold">
                      {card.price}
                    </p>
                    <p className="mt-3 max-w-md flex-1 text-sm font-light leading-relaxed text-mocha">
                      {card.body}
                    </p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <div className="mt-8">
              <Button href={`/${lang}/services`} variant="ghost">
                {dict.cta.services}
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      <WhyChooseUs dict={dict} />

      {/* Gallery */}
      <section id="gallery" className="scroll-mt-20">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 md:py-24 lg:px-8">
          <div className="max-w-2xl">
            <Reveal>
              <h2 className="text-4xl text-espresso sm:text-5xl">
                {dict.home.galleryHeading}
              </h2>
              <p className="mt-5 max-w-xl font-light leading-relaxed text-mocha">
                {dict.home.galleryIntro}
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <div className="mt-10">
              <Gallery slides={gallerySlides} />
            </div>
          </Reveal>
          <Reveal>
            <div className="mt-8">
              <Button href={`/${lang}/gallery`} variant="ghost">
                {dict.cta.seeMore}
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Reviews / testimonials */}
      <section id="testimonials" className="scroll-mt-20 bg-sand">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 md:py-24 lg:px-8">
          <div className="max-w-2xl">
            <Reveal>
              <h2 className="text-4xl text-espresso sm:text-5xl">
                {dict.reviews.headlineMain}
              </h2>
            </Reveal>
            {trust.show && (
              <Reveal delay={0.05}>
                <div
                  className="mt-6 flex items-center gap-3"
                  aria-label={trust.ariaLabel}
                >
                  <Stars className="text-gold [&>svg]:h-5 [&>svg]:w-5" />
                  <p className="text-sm text-mocha">
                    {trust.ratingDisplay} / {trust.bestRating},{" "}
                    {dict.reviews.basedOn} {trust.countDisplay}{" "}
                    {dict.reviews.reviewsWord}
                  </p>
                </div>
              </Reveal>
            )}
          </div>
          <div className="mt-10">
            <Testimonials dict={dict} />
          </div>
        </div>
      </section>

      <GiftCards dict={dict} />

      {/* Booking CTA */}
      <section id="booking" className="scroll-mt-20 bg-sand">
        <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-6 md:py-24">
          <Reveal>
            <h2 className="text-4xl text-espresso sm:text-5xl">
              {dict.home.bookingHeading}
            </h2>
            <p className="mx-auto mt-5 max-w-xl font-light leading-relaxed text-mocha">
              {dict.home.bookingIntro}
            </p>
            <div className="mt-10 grid grid-cols-1 justify-center gap-3 sm:flex sm:flex-row">
              <Button href={`/${lang}${site.booking}`} className="w-full sm:w-auto">
                {dict.cta.book}
                <ArrowIcon />
              </Button>
              <Button
                href={site.contact.phoneHref}
                variant="ghost"
                className="w-full sm:w-auto"
              >
                <PhoneIcon />
                {dict.cta.callNow}
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      <LocationsSection dict={dict} locale={lang} cards={salonCards} />
    </>
  );
}
