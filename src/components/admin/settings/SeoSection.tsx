"use client";

import baseSeo from "@/config/seo/seo.en.json";
import type { SeoDraft } from "@/lib/settings-draft";
import { inputClass, labelClass, spanClass } from "../form-styles";

// Key sets derive from the base SEO JSON so the form can never drift from the
// dictionary as keys are added. Labels are cosmetic (humanized from the key).
const META_KEYS = Object.keys(baseSeo.meta);
const SERVICE_IDS = Object.keys(baseSeo.services);
const SERVICE_FIELDS = ["metaTitle", "metaDescription", "schemaDescription", "heroAlt"] as const;
const GALLERY_IDS = Object.keys(baseSeo.gallery);

function humanize(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function LocaleSeoFields({
  locale,
  value,
  onChange,
}: {
  locale: string;
  value: SeoDraft;
  onChange: (next: SeoDraft) => void;
}) {
  const setMeta = (k: string, v: string) =>
    onChange({ ...value, meta: { ...value.meta, [k]: v } });
  const setService = (id: string, field: string, v: string) =>
    onChange({
      ...value,
      services: { ...value.services, [id]: { ...value.services[id], [field]: v } },
    });
  const setGallery = (id: string, v: string) =>
    onChange({
      ...value,
      gallery: { ...value.gallery, [id]: { ...value.gallery[id], alt: v } },
    });
  const setOrg = (v: string) =>
    onChange({ ...value, org: { ...value.org, description: v } });

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-semibold text-mocha">Page meta</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {META_KEYS.map((k) => (
            <label key={`${locale}-meta-${k}`} className={labelClass}>
              <span className={spanClass}>{humanize(k)}</span>
              <input
                className={inputClass}
                value={value.meta[k] ?? ""}
                onChange={(e) => setMeta(k, e.target.value)}
              />
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-mocha">Per-service</p>
        {SERVICE_IDS.map((id) => (
          <div key={`${locale}-svc-${id}`} className="mb-3">
            <p className="mb-1 text-[11px] uppercase tracking-wide text-tan">{id}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {SERVICE_FIELDS.map((f) => (
                <label key={`${locale}-svc-${id}-${f}`} className={labelClass}>
                  <span className={spanClass}>{humanize(f)}</span>
                  <input
                    className={inputClass}
                    value={value.services[id]?.[f] ?? ""}
                    onChange={(e) => setService(id, f, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-mocha">Gallery alt</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {GALLERY_IDS.map((id) => (
            <label key={`${locale}-gal-${id}`} className={labelClass}>
              <span className={spanClass}>{id}</span>
              <input
                className={inputClass}
                value={value.gallery[id]?.alt ?? ""}
                onChange={(e) => setGallery(id, e.target.value)}
              />
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-mocha">Organization</p>
        <label className={labelClass}>
          <span className={spanClass}>Description</span>
          <input
            className={inputClass}
            value={value.org.description ?? ""}
            onChange={(e) => setOrg(e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}

interface Props {
  seoFr: SeoDraft;
  seoEn: SeoDraft;
  onSeoFrChange: (next: SeoDraft) => void;
  onSeoEnChange: (next: SeoDraft) => void;
}

export function SeoSection({ seoFr, seoEn, onSeoFrChange, onSeoEnChange }: Props) {
  return (
    <fieldset className="rounded-xl border border-fog bg-beige/60 p-4">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-mocha">
        SEO
      </legend>

      <p className="mt-3 mb-2 text-xs font-semibold text-mocha">SEO — FR</p>
      <LocaleSeoFields locale="fr" value={seoFr} onChange={onSeoFrChange} />

      <p className="mt-5 mb-2 text-xs font-semibold text-mocha">SEO — EN</p>
      <LocaleSeoFields locale="en" value={seoEn} onChange={onSeoEnChange} />
    </fieldset>
  );
}
