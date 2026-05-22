import { testimonials } from "@/data/testimonials";

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5 text-espresso" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className={`h-4 w-4 ${i < count ? "fill-current" : "fill-espresso/20"}`}
        >
          <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 7.1-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export function Testimonials() {
  // Duplicate the list once so the -50% marquee translate loops seamlessly.
  const items = [...testimonials, ...testimonials];
  return (
    <div className="marquee-pause mt-12 overflow-hidden">
      <ul className="animate-marquee flex w-max">
        {items.map((t, i) => (
          <li
            key={i}
            aria-hidden={i >= testimonials.length || undefined}
            className="mr-6 flex w-[300px] shrink-0 flex-col rounded-2xl bg-cream p-6 text-left shadow-sm"
          >
            <div aria-label={`${t.rating} / 5`}>
              <Stars count={t.rating} />
            </div>
            <p className="mt-4 flex-1 leading-relaxed text-mocha">
              &quot;{t.quote}&quot;
            </p>
            <p className="mt-4 text-sm font-semibold text-espresso">
              {t.author}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
