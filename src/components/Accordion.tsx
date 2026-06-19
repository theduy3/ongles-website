import type { FaqItem } from "@/config/types";

// FAQ accordion built on native <details>/<summary> — content is in the DOM
// regardless of open state (crawlable), keyboard-accessible, works without JS.
export function Accordion({
  items,
}: {
  items: readonly FaqItem[];
}) {
  return (
    <div className="divide-y divide-tan/30 border-y border-tan/30">
      {items.map((item, i) => (
        <details key={i} className="group py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
            {item.q}
            <span className="text-tan transition-transform group-open:rotate-45" aria-hidden>
              +
            </span>
          </summary>
          {/* `a` stays clean plain text (faqPageGraph schema, D-30); an optional
              link renders as a SEPARATE inline anchor, never spliced into `a`. */}
          <p className="mt-3 leading-relaxed text-mocha">
            {item.a}
            {item.link ? (
              <>
                {" "}
                <a
                  href={item.link.href}
                  className="text-tan underline underline-offset-2 hover:text-espresso"
                >
                  {item.link.label}
                </a>
              </>
            ) : null}
          </p>
        </details>
      ))}
    </div>
  );
}
