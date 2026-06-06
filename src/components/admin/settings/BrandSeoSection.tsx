"use client";

import type { StoreSettings } from "@/lib/store-settings-schema";

export const inputClass =
  "w-full rounded-lg border border-tan bg-beige px-3 py-2 text-sm outline-none focus:border-espresso";

export const labelClass = "flex flex-col gap-1 text-xs";
export const spanClass = "text-tan";

// Brand / store identity fields (→ the `site` namespace). SEO meta text lives in
// the separate SeoSection (→ the `seo` namespace). inputClass/labelClass/spanClass
// are re-used by the other settings sections, so they stay exported here.

interface Props {
  site: NonNullable<StoreSettings["site"]>;
  onSiteChange: (patch: Partial<NonNullable<StoreSettings["site"]>>) => void;
}

export function BrandSeoSection({ site, onSiteChange }: Props) {
  return (
    <fieldset className="rounded-xl border border-fog bg-beige/60 p-4">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-mocha">
        Brand
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
          <span className={spanClass}>Widget host</span>
          <input
            className={inputClass}
            value={site.widgetHost ?? ""}
            placeholder="https://app.onglesmaily.com"
            onChange={(e) => onSiteChange({ widgetHost: e.target.value || undefined })}
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
    </fieldset>
  );
}
