import { z } from "zod";
import { defaultLocale, type Locale } from "@/lib/i18n";

// English-only site: `en` is required; fr/es/ar remain optional for forward
// compatibility (an owner can still store extra translations on a popup).
const Localized = z.object({
  en: z.string(),
  fr: z.string().optional(),
  es: z.string().optional(),
  ar: z.string().optional(),
});

const Base = z.object({
  id: z.string().min(1),
  version: z.number().int().nonnegative().default(0),
  priority: z.number().int().default(0),
  startsAt: z.string().nullable().default(null), // ISO; null = no bound
  endsAt: z.string().nullable().default(null),
  frequency: z.enum(["once", "session", "daily", "always"]).default("session"),
});

const RichPopup = Base.extend({
  type: z.literal("rich"),
  image: z
    .object({ url: z.url(), alt: z.string().default("") })
    .nullable()
    .default(null),
  title: Localized,
  body: Localized,
  cta: z
    .object({ label: Localized, href: z.string().min(1) })
    .nullable()
    .default(null),
});

const EmbedPopup = Base.extend({
  type: z.literal("embed"),
  html: z.string().min(1),
});

export const PopupSchema = z.discriminatedUnion("type", [
  RichPopup,
  EmbedPopup,
]);
export const PopupsSchema = z.array(PopupSchema);
export type Popup = z.infer<typeof PopupSchema>;

/**
 * Highest-priority pop-up whose [startsAt, endsAt] window contains `now`.
 *
 * This is the SERVER half of popup selection — it only knows the time window
 * and priority. It deliberately does NOT enforce `frequency` (once/session/
 * daily/always): that requires per-visitor seen-state, which lives in browser
 * storage the server has no access to. The CLIENT half — `shouldShow()` in
 * PopupHost.tsx — enforces frequency on the popup this function returns. The
 * split is a trust boundary, not an oversight: accepting client-reported
 * seen-state here would let a visitor spoof "I haven't seen this" to bypass
 * the frequency cap.
 */
export function pickActive(popups: Popup[], now: Date): Popup | null {
  const t = now.getTime();
  const active = popups.filter((p) => {
    const startOk = !p.startsAt || Date.parse(p.startsAt) <= t;
    const endOk = !p.endsAt || Date.parse(p.endsAt) >= t;
    return startOk && endOk;
  });
  if (active.length === 0) return null;
  return [...active].sort((a, b) => b.priority - a.priority)[0];
}

// Locale text with fallback: requested → default (fr) → en → empty.
export function pickText(
  text: Partial<Record<Locale, string>>,
  locale: Locale,
): string {
  return text[locale] || text[defaultLocale] || text.en || "";
}
