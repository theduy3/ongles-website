import { Reveal } from "./Reveal";
import { Button } from "./Button";
import { getStoreConfig } from "@/lib/store-config";
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
export async function GiftCards({
  dict,
}: {
  dict: Pick<Dictionary, "giftCards" | "cta">;
}) {
  const { site } = await getStoreConfig();
  const g = dict.giftCards;
  return (
    <section id="giftcards" className="scroll-mt-20">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <Reveal>
            <div>
              <h2 className="max-w-lg text-4xl text-espresso sm:text-5xl">
                {g.heading}
              </h2>
              <p className="mt-5 max-w-md font-light leading-relaxed text-mocha">
                {g.description}
              </p>
              <div className="mt-8">
                <Button href={site.booker.giftCertificate}>
                  {dict.cta.buyGiftCard}
                </Button>
              </div>
              <p className="mt-4 max-w-md text-xs leading-relaxed text-tan">
                {g.note}
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="grid grid-cols-2 gap-3 sm:gap-5">
              {g.designs.map((d, i) => (
                <div
                  key={d.title}
                  className={`flex aspect-[8/5] flex-col justify-between rounded-2xl p-4 shadow-card sm:p-5 ${TILE_STYLES[i % TILE_STYLES.length]} ${i % 2 === 1 ? "translate-y-4 sm:translate-y-6" : ""}`}
                >
                  <span className="font-[var(--font-jost)] text-xs uppercase tracking-[0.2em] opacity-80">
                    {site.name}
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
