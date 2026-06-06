"use client";

import { inputClass, labelClass, spanClass } from "./BrandSeoSection";

// SEO meta editor — writes to the SEPARATE `seo` namespace (settings-draft.ts),
// independent of UI copy. The keys surfaced here cover the highest-traffic pages.
// The full set (gallery, terms, privacy, per-service meta, gallery alt, etc.)
// lives in src/config/.../seo.{locale}.json; edit those rarer keys in the tenant
// config directly.
const META_KEYS = [
  { key: "homeTitle", label: "Home — meta title" },
  { key: "homeDescription", label: "Home — meta description" },
  { key: "servicesTitle", label: "Services — meta title" },
  { key: "servicesDescription", label: "Services — meta description" },
  { key: "aboutTitle", label: "About — meta title" },
  { key: "aboutDescription", label: "About — meta description" },
  { key: "bookOnlineTitle", label: "Book Online — meta title" },
  { key: "bookOnlineDescription", label: "Book Online — meta description" },
  { key: "contactTitle", label: "Contact — meta title" },
  { key: "contactDescription", label: "Contact — meta description" },
  { key: "reviewsTitle", label: "Reviews — meta title" },
  { key: "reviewsDescription", label: "Reviews — meta description" },
];

type SeoMeta = Record<string, unknown>;

interface Props {
  seoFr: SeoMeta;
  seoEn: SeoMeta;
  onSeoFrChange: (patch: SeoMeta) => void;
  onSeoEnChange: (patch: SeoMeta) => void;
}

export function SeoSection({ seoFr, seoEn, onSeoFrChange, onSeoEnChange }: Props) {
  return (
    <fieldset className="rounded-xl border border-fog bg-beige/60 p-4">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-mocha">
        SEO
      </legend>

      <p className="mt-3 mb-2 text-xs font-semibold text-mocha">SEO meta — FR</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {META_KEYS.map(({ key, label }) => (
          <label key={`fr-${key}`} className={labelClass}>
            <span className={spanClass}>{label}</span>
            <input
              className={inputClass}
              value={typeof seoFr[key] === "string" ? (seoFr[key] as string) : ""}
              onChange={(e) =>
                onSeoFrChange({ ...seoFr, [key]: e.target.value || undefined })
              }
            />
          </label>
        ))}
      </div>

      <p className="mt-4 mb-2 text-xs font-semibold text-mocha">SEO meta — EN</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {META_KEYS.map(({ key, label }) => (
          <label key={`en-${key}`} className={labelClass}>
            <span className={spanClass}>{label}</span>
            <input
              className={inputClass}
              value={typeof seoEn[key] === "string" ? (seoEn[key] as string) : ""}
              onChange={(e) =>
                onSeoEnChange({ ...seoEn, [key]: e.target.value || undefined })
              }
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
