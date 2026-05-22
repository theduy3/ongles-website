import type { Popup } from "@/lib/popup";
import { locales, type Locale } from "@/lib/i18n";

// Flat, all-strings form model for editing a popup, plus conversions to/from the
// strict Popup shape. Keeping this here (not in the component) makes the mapping
// reusable and easy to reason about; the server still re-validates via
// PopupSchema, so this is convenience, not the security boundary.

export type Draft = {
  id: string;
  version: number;
  priority: number;
  startsAt: string; // datetime-local value or "" (= no bound)
  endsAt: string;
  frequency: Popup["frequency"];
  type: Popup["type"];
  // rich fields
  title: Record<Locale, string>;
  body: Record<Locale, string>;
  ctaLabel: Record<Locale, string>;
  ctaHref: string;
  imageUrl: string;
  imageAlt: string;
  // embed field
  html: string;
};

function emptyLocalized(): Record<Locale, string> {
  return Object.fromEntries(locales.map((l) => [l, ""])) as Record<
    Locale,
    string
  >;
}

function fill(
  rec: Partial<Record<Locale, string>> | undefined,
): Record<Locale, string> {
  const out = emptyLocalized();
  if (rec) for (const l of locales) out[l] = rec[l] ?? "";
  return out;
}

export function emptyDraft(): Draft {
  return {
    id: "",
    version: 1,
    priority: 0,
    startsAt: "",
    endsAt: "",
    frequency: "session",
    type: "rich",
    title: emptyLocalized(),
    body: emptyLocalized(),
    ctaLabel: emptyLocalized(),
    ctaHref: "",
    imageUrl: "",
    imageAlt: "",
    html: "",
  };
}

export function toDraft(p: Popup): Draft {
  const base: Draft = {
    ...emptyDraft(),
    id: p.id,
    version: p.version,
    priority: p.priority,
    startsAt: p.startsAt ?? "",
    endsAt: p.endsAt ?? "",
    frequency: p.frequency,
    type: p.type,
  };
  if (p.type === "rich") {
    return {
      ...base,
      title: fill(p.title),
      body: fill(p.body),
      ctaLabel: fill(p.cta?.label),
      ctaHref: p.cta?.href ?? "",
      imageUrl: p.image?.url ?? "",
      imageAlt: p.image?.alt ?? "",
    };
  }
  return { ...base, html: p.html };
}

// `en` is required by the schema; include any other configured locale only when
// it carries a non-empty value. Iterates `locales` so adding a locale needs no
// change here.
function buildLocalized(rec: Record<Locale, string>): Record<Locale, string> {
  const out = {} as Record<Locale, string>;
  for (const l of locales) {
    const v = (rec[l] ?? "").trim();
    if (l === "en" || v) out[l] = v;
  }
  return out;
}

export function toPopup(d: Draft): Popup {
  const base = {
    id: d.id.trim(),
    version: d.version,
    priority: d.priority,
    startsAt: d.startsAt.trim() || null,
    endsAt: d.endsAt.trim() || null,
    frequency: d.frequency,
  };

  if (d.type === "embed") {
    return { ...base, type: "embed", html: d.html };
  }

  return {
    ...base,
    type: "rich",
    image: d.imageUrl.trim()
      ? { url: d.imageUrl.trim(), alt: d.imageAlt.trim() }
      : null,
    title: buildLocalized(d.title),
    body: buildLocalized(d.body),
    cta: d.ctaHref.trim()
      ? { label: buildLocalized(d.ctaLabel), href: d.ctaHref.trim() }
      : null,
  };
}
