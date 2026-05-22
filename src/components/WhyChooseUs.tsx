import { Reveal } from "./Reveal";
import type { Dictionary } from "@/lib/dictionary";

// "The Pure Difference" — four value cards. Server component (no interactivity).
export function WhyChooseUs({ dict }: { dict: Pick<Dictionary, "whyChooseUs"> }) {
  const w = dict.whyChooseUs;
  return (
    <section className="bg-fog">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.2em] text-mocha">
              {w.eyebrow}
            </p>
            <h2 className="mt-3 text-3xl text-espresso md:text-5xl">{w.heading}</h2>
            <p className="mt-5 leading-relaxed text-mocha">{w.intro}</p>
          </Reveal>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {w.features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08}>
              <article className="rounded-2xl bg-beige p-8 text-center shadow-sm">
                <div className="text-3xl" aria-hidden>
                  {f.icon}
                </div>
                <h3 className="mt-5 text-xl text-espresso">{f.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-mocha">{f.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
