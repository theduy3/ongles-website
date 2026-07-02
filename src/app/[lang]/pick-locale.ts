import { isLocale, type Locale } from "@/lib/i18n";

// The pure locale-guard decision, kept framework-free (no next/navigation) so it
// is unit-testable without pulling the App Router / React context chain. The
// framework shells that turn null into a response live in ./locale-guard.
//
// Given the raw [lang] segment and an optional single-locale restriction, return
// the narrowed locale we should serve, or null. `only` rejects a valid-but-wrong
// locale (e.g. /tarifs is FR-only, /pricing EN-only) as a 404.
export function pickLocale(lang: string, only?: Locale): Locale | null {
  if (!isLocale(lang)) return null;
  if (only && lang !== only) return null;
  return lang;
}
