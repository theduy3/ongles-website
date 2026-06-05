"use client";

import type { StoreSettings } from "@/lib/store-settings-schema";

export const inputClass =
  "w-full rounded-lg border border-tan bg-beige px-3 py-2 text-sm outline-none focus:border-espresso";

export const labelClass = "flex flex-col gap-1 text-xs";
export const spanClass = "text-tan";

// The meta keys surfaced here cover the highest-traffic pages. The full set
// (gallery, terms, privacy, reviewsPage, serviceDetails, etc.) lives in
// content.{locale}.json but is too large to surface all at once — update
// content directly in the tenant config for those rare keys.
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

type ContentMeta = Record<string, unknown>;

interface Props {
  site: NonNullable<StoreSettings["site"]>;
  contentFr: ContentMeta;
  contentEn: ContentMeta;
  onSiteChange: (patch: Partial<NonNullable<StoreSettings["site"]>>) => void;
  onContentFrChange: (patch: ContentMeta) => void;
  onContentEnChange: (patch: ContentMeta) => void;
}

export function BrandSeoSection({
  site,
  contentFr,
  contentEn,
  onSiteChange,
  onContentFrChange,
  onContentEnChange,
}: Props) {
  return (
    <fieldset className="rounded-xl border border-fog bg-beige/60 p-4">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-mocha">
        Brand &amp; SEO
      </legend>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          <span className={spanClass}>Store name</span>
          <input
            className={inputClass}
            value={site.name ?? ""}
            onChange={(e) => onSiteChange({ name: e.target.value || undefined })}
          />
        </label>
        <label className={labelClass}>
          <span className={spanClass}>Site URL</span>
          <input
            className={inputClass}
            value={site.url ?? ""}
            placeholder="https://example.com"
            onChange={(e) => onSiteChange({ url: e.target.value || undefined })}
          />
        </label>
        <label className={labelClass}>
          <span className={spanClass}>Store ID</span>
          <input
            className={inputClass}
            value={site.storeId ?? ""}
            onChange={(e) => onSiteChange({ storeId: e.target.value || undefined })}
          />
        </label>
        <label className={labelClass}>
          <span className={spanClass}>Price range</span>
          <input
            className={inputClass}
            value={site.priceRange ?? ""}
            placeholder="$$"
            onChange={(e) => onSiteChange({ priceRange: e.target.value || undefined })}
          />
        </label>
      </div>

      <p className="mt-4 mb-2 text-xs font-semibold text-mocha">SEO meta — FR</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {META_KEYS.map(({ key, label }) => (
          <label key={`fr-${key}`} className={labelClass}>
            <span className={spanClass}>{label}</span>
            <input
              className={inputClass}
              value={typeof contentFr[key] === "string" ? (contentFr[key] as string) : ""}
              onChange={(e) =>
                onContentFrChange({ ...contentFr, [key]: e.target.value || undefined })
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
              value={typeof contentEn[key] === "string" ? (contentEn[key] as string) : ""}
              onChange={(e) =>
                onContentEnChange({ ...contentEn, [key]: e.target.value || undefined })
              }
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
