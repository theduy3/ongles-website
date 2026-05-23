import "server-only";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionary";

// Dictionaries load only on the server, so the (potentially large) translation
// JSON never ships to the client bundle. en.json is the canonical shape.
// fr.json mirrors en.json in key structure; both ship in the server bundle only.
const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  fr: () => import("@/dictionaries/fr.json").then((m) => m.default),
  en: () => import("@/dictionaries/en.json").then((m) => m.default),
};

export const getDictionary = (locale: Locale): Promise<Dictionary> =>
  dictionaries[locale]();
