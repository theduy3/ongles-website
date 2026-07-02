import { notFound } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { pickLocale } from "./pick-locale";

// Request-time locale guard shells for [lang] pages. Every page opens by
// unwrapping the async `params`, validating the [lang] segment, and — for
// single-locale slugs like /tarifs (FR) or /pricing (EN) — rejecting the wrong
// locale. The pure decision is pickLocale (./pick-locale); these shells turn a
// null decision into the right response for their context — notFound() in a page
// body, an empty Metadata in generateMetadata. They are the thin framework edge
// (they import next/navigation), so they are not unit-tested; pick-locale is.

/**
 * Page-body guard: unwrap params, validate, and `notFound()` on a miss.
 * Returns the narrowed locale. Use in the default export.
 */
export async function requireLocale(
  params: Promise<{ lang: string }>,
  only?: Locale,
): Promise<Locale> {
  const { lang } = await params;
  const locale = pickLocale(lang, only);
  if (!locale) notFound();
  return locale;
}

/**
 * generateMetadata guard: unwrap params and validate, returning null on a miss
 * so the caller can `return {}` (notFound() is not the metadata contract).
 */
export async function resolveLocale(
  params: Promise<{ lang: string }>,
  only?: Locale,
): Promise<Locale | null> {
  const { lang } = await params;
  return pickLocale(lang, only);
}
