"use client";

import { useState } from "react";
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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok && data.success) onSiteChange({ logo: data.data.url });
      else setUploadError(data.error ?? "Upload failed");
    } catch {
      setUploadError("Upload network error");
    } finally {
      setUploading(false);
    }
  }

  async function onPickFavicon(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok && data.success) onSiteChange({ favicon: data.data.url });
      else setUploadError(data.error ?? "Upload failed");
    } catch {
      setUploadError("Upload network error");
    } finally {
      setUploading(false);
    }
  }

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

      <div className="mt-3 flex flex-col gap-2 border-t border-fog pt-3">
        <span className={spanClass}>Logo</span>
        <input type="file" accept="image/*" onChange={onPickLogo} className="text-xs" />
        {uploading && <p className="text-xs text-tan">Uploading…</p>}
        {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
        {site.logo && (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- preview only */}
            <img src={site.logo} alt="" className="h-10 w-auto rounded bg-white p-1" />
            <button
              type="button"
              className="text-xs text-red-600 underline"
              onClick={() => onSiteChange({ logo: undefined })}
            >
              Remove
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2 border-t border-fog pt-3">
        <span className={spanClass}>Favicon</span>
        <input
          type="file"
          accept="image/png,image/x-icon,image/svg+xml,image/*"
          onChange={onPickFavicon}
          className="text-xs"
        />
        <p className="text-xs text-tan">Square PNG, ICO, or SVG recommended.</p>
        {uploading && <p className="text-xs text-tan">Uploading…</p>}
        {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
        {site.favicon && (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- preview only */}
            <img src={site.favicon} alt="" className="h-8 w-8 rounded bg-white p-1" />
            <button
              type="button"
              className="text-xs text-red-600 underline"
              onClick={() => onSiteChange({ favicon: undefined })}
            >
              Remove
            </button>
          </div>
        )}
      </div>
    </fieldset>
  );
}
