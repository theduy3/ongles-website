import Link from "next/link";
import { Reveal } from "./Reveal";
import { LocationCard } from "./LocationCard";
import { locations } from "@/lib/locations";
import type { Dictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";

// Homepage "Find Us" band — all five locations as map cards, plus a link to the
// full Locations page. Server component.
export function LocationsSection({
  dict,
  locale,
}: {
  dict: Pick<Dictionary, "locations">;
  locale: Locale;
}) {
  const l = dict.locations;
  return (
    <section id="location" className="scroll-mt-24 bg-fog">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.2em] text-mocha">
              {l.eyebrow}
            </p>
            <h2 className="mt-3 text-3xl text-espresso md:text-5xl">{l.heading}</h2>
            <p className="mt-5 leading-relaxed text-mocha">{l.intro}</p>
          </Reveal>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {locations.map((loc, i) => (
            <Reveal key={loc.id} delay={(i % 3) * 0.08}>
              <LocationCard loc={loc} dict={dict} />
            </Reveal>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link
            href={`/${locale}/locations`}
            className="text-sm font-semibold uppercase tracking-wide text-espresso underline-offset-4 hover:underline"
          >
            {l.viewAll}
          </Link>
        </div>
      </div>
    </section>
  );
}
