"use client";

import type { StoreSettings } from "@/lib/store-settings-schema";
import { inputClass, labelClass, spanClass } from "./BrandSeoSection";

type SiteSection = NonNullable<StoreSettings["site"]>;
type HoursEntry = { days: string[]; opens: string; closes: string };

interface Props {
  site: SiteSection;
  onSiteChange: (patch: Partial<SiteSection>) => void;
}

function emptyHoursEntry(): HoursEntry {
  return { days: [], opens: "", closes: "" };
}

export function ContactHoursSection({ site, onSiteChange }: Props) {
  const contact = site.contact ?? {};
  const address = contact.address ?? {};
  const hours: HoursEntry[] = site.hours ?? [];

  function patchContact(patch: Partial<NonNullable<SiteSection["contact"]>>) {
    onSiteChange({ contact: { ...contact, ...patch } });
  }

  function patchAddress(patch: Partial<NonNullable<SiteSection["contact"]>["address"] & object>) {
    patchContact({ address: { ...address, ...patch } });
  }

  function setHours(next: HoursEntry[]) {
    onSiteChange({ hours: next.length > 0 ? next : undefined });
  }

  function updateHoursEntry(idx: number, patch: Partial<HoursEntry>) {
    setHours(hours.map((h, i) => (i === idx ? { ...h, ...patch } : h)));
  }

  function removeHoursEntry(idx: number) {
    setHours(hours.filter((_, i) => i !== idx));
  }

  return (
    <>
      {/* Contact / NAP */}
      <fieldset className="rounded-xl border border-fog bg-beige/60 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-mocha">
          Contact / NAP
        </legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            <span className={spanClass}>Email</span>
            <input
              type="email"
              className={inputClass}
              value={contact.email ?? ""}
              onChange={(e) => patchContact({ email: e.target.value || undefined })}
            />
          </label>
          <label className={labelClass}>
            <span className={spanClass}>Phone (display)</span>
            <input
              className={inputClass}
              value={contact.phone ?? ""}
              placeholder="(418) 555-0000"
              onChange={(e) => patchContact({ phone: e.target.value || undefined })}
            />
          </label>
          <label className={labelClass}>
            <span className={spanClass}>Phone href</span>
            <input
              className={inputClass}
              value={contact.phoneHref ?? ""}
              placeholder="tel:+14185550000"
              onChange={(e) => patchContact({ phoneHref: e.target.value || undefined })}
            />
          </label>
          <label className={labelClass}>
            <span className={spanClass}>Landmark</span>
            <input
              className={inputClass}
              value={contact.landmark ?? ""}
              onChange={(e) => patchContact({ landmark: e.target.value || undefined })}
            />
          </label>
          <label className={labelClass}>
            <span className={spanClass}>Address line 1</span>
            <input
              className={inputClass}
              value={address.line1 ?? ""}
              onChange={(e) => patchAddress({ line1: e.target.value || undefined })}
            />
          </label>
          <label className={labelClass}>
            <span className={spanClass}>Address line 2</span>
            <input
              className={inputClass}
              value={address.line2 ?? ""}
              onChange={(e) => patchAddress({ line2: e.target.value || undefined })}
            />
          </label>
          <label className={labelClass}>
            <span className={spanClass}>Street</span>
            <input
              className={inputClass}
              value={address.street ?? ""}
              onChange={(e) => patchAddress({ street: e.target.value || undefined })}
            />
          </label>
          <label className={labelClass}>
            <span className={spanClass}>City</span>
            <input
              className={inputClass}
              value={address.city ?? ""}
              onChange={(e) => patchAddress({ city: e.target.value || undefined })}
            />
          </label>
          <label className={labelClass}>
            <span className={spanClass}>Region / Province</span>
            <input
              className={inputClass}
              value={address.region ?? ""}
              onChange={(e) => patchAddress({ region: e.target.value || undefined })}
            />
          </label>
          <label className={labelClass}>
            <span className={spanClass}>Postal code</span>
            <input
              className={inputClass}
              value={address.postalCode ?? ""}
              onChange={(e) => patchAddress({ postalCode: e.target.value || undefined })}
            />
          </label>
          <label className={labelClass}>
            <span className={spanClass}>Country</span>
            <input
              className={inputClass}
              value={address.country ?? ""}
              onChange={(e) => patchAddress({ country: e.target.value || undefined })}
            />
          </label>
        </div>
      </fieldset>

      {/* Hours */}
      <fieldset className="rounded-xl border border-fog bg-beige/60 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-mocha">
          Hours (replaces whole array)
        </legend>
        <div className="mt-3 flex flex-col gap-3">
          {hours.map((entry, idx) => (
            <div
              key={idx}
              className="grid gap-2 rounded-lg border border-tan bg-cream p-3 sm:grid-cols-3"
            >
              <label className={labelClass}>
                <span className={spanClass}>Days (comma-separated)</span>
                <input
                  className={inputClass}
                  value={entry.days.join(", ")}
                  placeholder="Monday, Tuesday"
                  onChange={(e) =>
                    updateHoursEntry(idx, {
                      days: e.target.value
                        .split(",")
                        .map((d) => d.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </label>
              <label className={labelClass}>
                <span className={spanClass}>Opens</span>
                <input
                  className={inputClass}
                  value={entry.opens}
                  placeholder="09:00"
                  onChange={(e) => updateHoursEntry(idx, { opens: e.target.value })}
                />
              </label>
              <label className={labelClass}>
                <span className={spanClass}>Closes</span>
                <div className="flex gap-2">
                  <input
                    className={inputClass}
                    value={entry.closes}
                    placeholder="17:30"
                    onChange={(e) => updateHoursEntry(idx, { closes: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => removeHoursEntry(idx)}
                    className="shrink-0 text-xs text-red-600 underline"
                  >
                    Remove
                  </button>
                </div>
              </label>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setHours([...hours, emptyHoursEntry()])}
            className="self-start rounded-pill border border-tan px-3 py-1 text-xs"
          >
            + Add hours row
          </button>
        </div>
      </fieldset>
    </>
  );
}
