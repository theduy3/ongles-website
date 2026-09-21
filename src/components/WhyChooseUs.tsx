import Image from "next/image";
import { Reveal } from "./Reveal";
import type { Dictionary } from "@/lib/dictionary";

// A split editorial section gives the hygiene promise a visual anchor while
// keeping the four tenant-specific reasons as scannable content.
export function WhyChooseUs({ dict }: { dict: Pick<Dictionary, "whyChooseUs"> }) {
  const w = dict.whyChooseUs;

  return (
    <section className="border-y border-espresso/10 bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-5 py-16 sm:px-6 md:gap-16 md:py-24 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:px-8">
        <Reveal>
          <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl shadow-card">
            <div className="relative aspect-[4/5] w-full">
              <Image
                src="/images/home/hygiene-detail.png"
                alt="Clean manicure tools and a nail polish bottle"
                fill
                sizes="(max-width: 1024px) 100vw, 34vw"
                className="object-cover"
              />
            </div>
          </div>
        </Reveal>

        <div>
          <Reveal>
            <h2 className="max-w-xl text-4xl text-espresso sm:text-5xl">
              {w.heading}
            </h2>
            <p className="mt-5 max-w-xl font-light leading-relaxed text-mocha">
              {w.intro}
            </p>
          </Reveal>

          <div className="mt-8">
            {w.features.map((feature, i) => (
              <Reveal key={feature.title} delay={i * 0.06}>
                <article className="border-t border-espresso/15 py-5 first:border-t-0 first:pt-0 last:pb-0">
                  <h3 className="text-2xl text-espresso">{feature.title}</h3>
                  <p className="mt-2 max-w-xl text-sm font-light leading-relaxed text-mocha">
                    {feature.body}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
