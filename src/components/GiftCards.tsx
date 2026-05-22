import { Reveal } from "./Reveal";
import { Button } from "./Button";
import { site } from "@/lib/site";
import type { Dictionary } from "@/lib/dictionary";

// Gift Cards section (homepage anchor #giftcards). Designs are styled tiles; the
// CTA links out to the Booker gift-certificate flow. Server component.
export function GiftCards({ dict }: { dict: Pick<Dictionary, "giftCards" | "cta"> }) {
  const g = dict.giftCards;
  return (
    <section id="giftcards" className="scroll-mt-24">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-mocha">
                {g.eyebrow}
              </p>
              <h2 className="mt-3 text-3xl text-espresso md:text-5xl">{g.heading}</h2>
              <p className="mt-5 max-w-md leading-relaxed text-mocha">
                {g.description}
              </p>
              <div className="mt-8">
                <Button href={site.booker.giftCertificate}>{dict.cta.buyGiftCard}</Button>
              </div>
              <p className="mt-4 text-xs uppercase tracking-wide text-tan">{g.note}</p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="grid grid-cols-2 gap-4">
              {g.designs.map((d, i) => (
                <div
                  key={d.title}
                  className={`flex aspect-[8/5] items-end rounded-2xl p-5 shadow-sm ${
                    i % 2 === 0 ? "bg-espresso text-cream" : "bg-fog text-espresso"
                  }`}
                >
                  <span className="font-[var(--font-cormorant)] text-xl">{d.title}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
