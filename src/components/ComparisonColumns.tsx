/**
 * ComparisonColumns — server component.
 *
 * Two-column card layout for comparison/decision pages (UI-SPEC §B, locked
 * decision: cards NOT a data table). Desktop: side-by-side grid-cols-2.
 * Mobile: single column (stacks). Each column = white shadow-card with:
 *   - <h2> option name
 *   - 1–2 sentence descriptor
 *   - 3–5 attribute bullets
 *
 * Both columns reflect real services (gel AND acrylic both offered — P-06).
 */

export type ComparisonColumn = {
  /** Option name rendered as <h2> inside the card. */
  name: string;
  /** 1–2 sentence descriptor below the name. */
  descriptor: string;
  /** 3–5 attribute bullets (plain prose). */
  bullets: string[];
};

export function ComparisonColumns({
  left,
  right,
}: {
  left: ComparisonColumn;
  right: ComparisonColumn;
}) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <div className="grid gap-8 md:grid-cols-2">
        <ComparisonCard column={left} />
        <ComparisonCard column={right} />
      </div>
    </section>
  );
}

function ComparisonCard({ column }: { column: ComparisonColumn }) {
  return (
    <div className="shadow-card rounded-2xl bg-white p-8">
      <h2 className="text-2xl text-espresso md:text-3xl">{column.name}</h2>
      <p className="mt-4 leading-relaxed text-mocha">{column.descriptor}</p>
      <ul className="mt-6 space-y-3">
        {column.bullets.map((bullet) => (
          <li key={bullet} className="flex gap-3 leading-relaxed text-mocha">
            <span aria-hidden className="text-tan">
              —
            </span>
            {bullet}
          </li>
        ))}
      </ul>
    </div>
  );
}
