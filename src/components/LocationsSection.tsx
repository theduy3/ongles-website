"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LocationCard } from "./LocationCard";
import { locations } from "@/lib/locations";
import type { Dictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";

function ArrowButton({
  dir,
  disabled,
  onClick,
}: {
  dir: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "prev" ? "Previous locations" : "Next locations"}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-espresso/20 text-espresso transition-colors hover:border-espresso disabled:opacity-30"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        {dir === "prev" ? (
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </button>
  );
}

// Homepage "Find Us" band — all five locations as a scroll-snap carousel with
// prev/next arrows, plus a link to the full Locations page.
export function LocationsSection({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const l = dict.locations;
  const trackRef = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    update();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const scrollByCard = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.85), behavior: "smooth" });
  };

  return (
    <section id="location" className="scroll-mt-20 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.2em] text-gold">
              {l.eyebrow}
            </p>
            <h2 className="mt-3 text-4xl text-espresso md:text-5xl">{l.heading}</h2>
            <p className="mt-5 font-light leading-relaxed text-mocha">{l.intro}</p>
          </div>
          <div className="flex gap-3">
            <ArrowButton dir="prev" disabled={!canPrev} onClick={() => scrollByCard(-1)} />
            <ArrowButton dir="next" disabled={!canNext} onClick={() => scrollByCard(1)} />
          </div>
        </div>

        <ul
          ref={trackRef}
          className="mt-12 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {locations.map((loc) => (
            <li
              key={loc.id}
              className="w-[300px] shrink-0 snap-start sm:w-[340px]"
            >
              <LocationCard loc={loc} dict={dict} />
            </li>
          ))}
        </ul>

        <div className="mt-10 text-center">
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
