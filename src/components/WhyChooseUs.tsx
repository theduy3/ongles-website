import { Reveal } from "./Reveal";
import type { Dictionary } from "@/lib/dictionary";

// "The Pure Difference" — four value cards on a white band. Server component.
export function WhyChooseUs({ dict }: { dict: Pick<Dictionary, "whyChooseUs"> }) {
  const w = dict.whyChooseUs;
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.2em] text-gold">
              {w.eyebrow}
            </p>
            <h2 className="mt-3 text-4xl text-espresso md:text-5xl">{w.heading}</h2>
            <p className="mt-5 font-light leading-relaxed text-mocha">{w.intro}</p>
          </Reveal>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {w.features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08}>
              <article className="h-full rounded-xl bg-cream p-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl shadow-card" aria-hidden>
                  {f.icon}
                </div>
                <h3 className="mt-5 text-xl text-espresso">{f.title}</h3>
                <p className="mt-3 text-sm font-light leading-relaxed text-mocha">
                  {f.body}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
