// PricingTable — server component for the pricing page (PAGE-01 / 04-02).
// Renders a semantic <dl> price list inside a single white shadow-card panel.
// One row per service: service name (link to detail page) + price range in gold.
// Mobile: rows stack label-over-value, no horizontal scroll (P-13).
// Price-only — no duration, no per-row blurb (P-14).

import Link from "next/link";
import type { Locale } from "@/lib/i18n";

export type PricingRow = {
  id: string;
  name: string;
  href: string; // localized service detail path, e.g. "/fr/services/pose-d-ongles"
  price: number;
  priceTo?: number;
};

type PricingTableLabels = {
  /** Column header for the service name column */
  service: string;
  /** Column header for the price column */
  price: string;
  /** Currency symbol or suffix, e.g. "$" */
  currency: string;
};

const DEFAULT_LABELS: Record<Locale, PricingTableLabels> = {
  fr: { service: "Service", price: "Prix", currency: "$" },
  en: { service: "Service", price: "Price", currency: "$" },
};

function formatPriceRange(
  price: number,
  priceTo: number | undefined,
  currency: string,
): string {
  if (!priceTo || priceTo <= price) {
    return `${price} ${currency}`;
  }
  return `${price} ${currency} – ${priceTo} ${currency}`;
}

export function PricingTable({
  lang,
  rows,
  labels,
}: {
  lang: Locale;
  rows: readonly PricingRow[];
  labels?: Partial<PricingTableLabels>;
}) {
  const resolvedLabels: PricingTableLabels = {
    ...DEFAULT_LABELS[lang],
    ...labels,
  };

  return (
    <section className="mx-auto max-w-3xl px-6 py-12">
      <div className="rounded-2xl bg-white shadow-card">
        {/* Column headers — sr-only on mobile, visible md+ */}
        <div
          className="hidden grid-cols-2 border-b border-sand px-6 py-3 md:grid"
          aria-hidden="true"
        >
          <span className="text-sm uppercase tracking-wide text-tan">
            {resolvedLabels.service}
          </span>
          <span className="text-right text-sm uppercase tracking-wide text-tan">
            {resolvedLabels.price}
          </span>
        </div>

        {/* Price rows as a <dl> — semantic, AI-extractable */}
        <dl className="divide-y divide-sand">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              {/* Service name — links to service detail page (P-19 cross-link) */}
              <dt className="font-medium text-espresso">
                <Link
                  href={row.href}
                  className="hover:text-gold transition-colors"
                >
                  {row.name}
                </Link>
              </dt>

              {/* Price range — gold emphasis */}
              <dd className="text-gold font-medium sm:text-right">
                {formatPriceRange(row.price, row.priceTo, resolvedLabels.currency)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
