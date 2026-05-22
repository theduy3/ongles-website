"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { testimonials } from "@/data/testimonials";

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5 text-gold" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 24 24" className={`h-4 w-4 ${i < count ? "fill-current" : "fill-espresso/15"}`}>
          <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 7.1-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

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
      aria-label={dir === "prev" ? "Previous testimonials" : "Next testimonials"}
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

// Horizontal scroll-snap carousel with prev/next arrows (replaces the marquee).
export function Testimonials() {
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
    <div>
      <ul
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {testimonials.map((t, i) => (
          <li
            key={i}
            className="flex w-[300px] shrink-0 snap-start flex-col rounded-xl bg-white p-6 text-left shadow-card sm:w-[360px]"
          >
            <Stars count={t.rating} />
            <p className="mt-4 flex-1 font-light leading-relaxed text-mocha">
              &ldquo;{t.quote}&rdquo;
            </p>
            <div className="mt-6 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sand font-semibold text-espresso">
                {t.author.charAt(0)}
              </span>
              <span>
                <span className="block text-sm font-semibold text-espresso">
                  {t.author}
                </span>
                <span className="block text-xs uppercase tracking-wide text-tan">
                  {t.status}
                </span>
              </span>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex justify-center gap-3">
        <ArrowButton dir="prev" disabled={!canPrev} onClick={() => scrollByCard(-1)} />
        <ArrowButton dir="next" disabled={!canNext} onClick={() => scrollByCard(1)} />
      </div>
    </div>
  );
}
