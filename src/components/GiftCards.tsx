import { Reveal } from "./Reveal";
import { Button } from "./Button";
import { site } from "@/lib/site";
import type { Dictionary } from "@/lib/dictionary";

// Tile background treatments cycle through the warm accent palette.
const TILE_STYLES = [
  "bg-espresso text-cream",
  "bg-gold text-white",
  "bg-rose text-white",
  "bg-sand text-espresso",
];

// Gift Cards section (#giftcards): left copy + CTA, right 4 staggered design
// tiles. CTA links out to the Booker gift-certificate flow. Server component.
export function GiftCards({ dict }: { dict: Pick<Dictionary, "giftCards" | "cta"> }) {
  const g = dict.giftCards;
  return (
    <section id="giftcards" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gold">
                {g.eyebrow}
              </p>
              <h2 className="mt-3 text-4xl text-espresso md:text-5xl">{g.heading}</h2>
              <p className="mt-5 max-w-md font-light leading-relaxed text-mocha">
                {g.description}
              </p>
              <div className="mt-8">
                <Button href={site.booker.giftCertificate}>
                  {dict.cta.buyGiftCard}
                </Button>
              </div>
              <p className="mt-4 text-xs uppercase tracking-wide text-tan">{g.note}</p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="grid grid-cols-2 gap-5">
              {g.designs.map((d, i) => (
                <div
                  key={d.title}
                  className={`flex aspect-[8/5] flex-col justify-between rounded-2xl p-5 shadow-card ${TILE_STYLES[i % TILE_STYLES.length]} ${i % 2 === 1 ? "translate-y-6" : ""}`}
                >
                  <span className="font-[var(--font-jost)] text-xs uppercase tracking-[0.2em] opacity-80">
                    Pure Nail Bar
                  </span>
                  <span className="font-[var(--font-cormorant)] text-2xl leading-tight">
                    {d.title}
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
