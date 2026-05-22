// FAQ accordion built on native <details>/<summary> — content is in the DOM
// regardless of open state (crawlable), keyboard-accessible, works without JS.
export function Accordion({
  items,
}: {
  items: readonly { q: string; a: string }[];
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
          <p className="mt-3 leading-relaxed text-mocha">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
