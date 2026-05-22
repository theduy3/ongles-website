// Accessible comparison matrix for decision pages. Pure presentational server
// component — data comes from dict.comparisons[id] (columns + rows). The first
// column is a row-header (criterion); remaining cells are per-option values.

type Row = { label: string; cells: string[] };

export function ComparisonTable({
  columns,
  rows,
  caption,
}: {
  columns: string[];
  rows: Row[];
  caption?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] border-collapse text-left text-mocha">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-tan/50">
            {columns.map((col, i) => (
              <th
                key={col}
                scope="col"
                className={`px-3 py-3 text-sm font-semibold uppercase tracking-wide text-espresso ${
                  i === 0 ? "" : "text-center"
                }`}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-fog">
              <th
                scope="row"
                className="px-3 py-3 font-medium text-espresso"
              >
                {row.label}
              </th>
              {row.cells.map((cell, i) => (
                <td
                  key={`${row.label}-${i}`}
                  className="px-3 py-3 text-center leading-relaxed"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
