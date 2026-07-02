/**
 * comparisons.ts — Comparison page registry.
 *
 * Mirrors the shape of src/lib/services.ts:
 *   comparisonBySlug(lang, slug)   → find by FR or EN slug
 *   comparisonPath(record, lang)   → locale-specific route path
 *   comparisonPathsByLocale(record) → { fr: ..., en: ... }
 *
 * FR slugs match the pages.comparison keys in seo.*.json.
 * EN slugs are idiomatic and stable.
 */

import { locales, type Locale } from "@/lib/i18n";

export type ComparisonRecord = {
  /** Unique identifier — matches pages.comparison key in seo JSON. */
  id: string;
  slug: Record<Locale, string>;
  /**
   * Short locale-aware link label (nav-style, not the SEO metaTitle). Single
   * source for cross-links like /llms.txt, so the EN list can't fall back to the
   * FR label.
   */
  label: Record<Locale, string>;
  /** Service ids from both sides of the comparison (for cross-linking). */
  services: string[];
};

export const COMPARISONS: ComparisonRecord[] = [
  {
    id: "pose-vs-remplissage",
    slug: { fr: "pose-vs-remplissage", en: "nail-extensions-vs-fill" },
    label: { fr: "Pose vs remplissage", en: "Nail extensions vs fill" },
    services: ["pose-ongles", "remplissage"],
  },
  {
    id: "manucure-vs-pedicure",
    slug: { fr: "manucure-vs-pedicure", en: "manicure-vs-pedicure" },
    label: { fr: "Manucure vs pédicure", en: "Manicure vs pedicure" },
    services: ["soins-mains", "soins-pieds"],
  },
  {
    id: "gel-vs-acrylique",
    slug: { fr: "gel-vs-acrylique", en: "gel-vs-acrylic" },
    label: { fr: "Gel vs acrylique", en: "Gel vs acrylic" },
    services: ["pose-ongles"],
  },
  {
    id: "meilleur-pour",
    slug: { fr: "meilleur-pour", en: "best-for" },
    label: { fr: "Meilleur pour vous", en: "Best for you" },
    services: ["pose-ongles", "soins-mains", "soins-pieds"],
  },
];

/**
 * Find a comparison record by FR or EN slug.
 * Returns undefined for unknown slugs.
 */
export function comparisonBySlug(
  lang: Locale,
  slug: string,
): ComparisonRecord | undefined {
  return COMPARISONS.find((c) => c.slug[lang] === slug);
}

/**
 * Return the locale-specific route path for a comparison record.
 * FR uses /comparaisons/[slug]; EN uses /comparisons/[slug].
 */
export function comparisonPath(
  record: ComparisonRecord,
  lang: Locale,
): string {
  const folder = lang === "fr" ? "comparaisons" : "comparisons";
  return `/${folder}/${record.slug[lang]}`;
}

/**
 * Return a map of all locale paths for a comparison record.
 * Mirrors servicePathsByLocale from services.ts.
 */
export function comparisonPathsByLocale(
  record: ComparisonRecord,
): Record<Locale, string> {
  return Object.fromEntries(
    locales.map((l) => [l, comparisonPath(record, l)]),
  ) as Record<Locale, string>;
}
