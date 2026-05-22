import "server-only";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionary";

// Dictionaries load only on the server, so the (potentially large) translation
// JSON never ships to the client bundle. en.json is the canonical shape.
// Pure Nail Bar is English-only; additional locales can be added here as needed.
const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("@/dictionaries/en.json").then((m) => m.default),
};

export const getDictionary = (locale: Locale): Promise<Dictionary> =>
  dictionaries[locale]();
