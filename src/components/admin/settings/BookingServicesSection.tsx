"use client";

import type { StoreSettings } from "@/lib/store-settings-schema";
import { inputClass, labelClass, spanClass } from "../form-styles";

type SiteSection = NonNullable<StoreSettings["site"]>;
type ServiceOverride = NonNullable<StoreSettings["services"]>[number];

const SERVICE_IDS = [
  "pose-ongles",
  "remplissage",
  "soins-mains",
  "soins-pieds",
] as const;

const SERVICE_LABELS: Record<string, string> = {
  "pose-ongles": "Nail enhancements (pose-ongles)",
  remplissage: "Fill (remplissage)",
  "soins-mains": "Manicure (soins-mains)",
  "soins-pieds": "Pedicure (soins-pieds)",
};

interface Props {
  site: SiteSection;
  services: ServiceOverride[];
  onSiteChange: (patch: Partial<SiteSection>) => void;
  onServicesChange: (next: ServiceOverride[]) => void;
}

export function BookingServicesSection({
  site,
  services,
  onSiteChange,
  onServicesChange,
}: Props) {
  const booker = site.booker ?? {};
  const reviews = site.reviews ?? {};
  const geo = site.geo ?? {};
  const socialProfiles = site.socialProfiles ?? [];

  function patchBooker(patch: Partial<NonNullable<SiteSection["booker"]>>) {
    onSiteChange({ booker: { ...booker, ...patch } });
  }

  function patchReviews(patch: Partial<NonNullable<SiteSection["reviews"]>>) {
    onSiteChange({ reviews: { ...reviews, ...patch } });
  }

  function patchGeo(patch: Partial<NonNullable<SiteSection["geo"]>>) {
    onSiteChange({ geo: { ...geo, ...patch } });
  }

  function getService(id: string): ServiceOverride | undefined {
    return services.find((s) => s.id === id);
  }

  function patchService(
    id: (typeof SERVICE_IDS)[number],
    patch: Partial<Omit<ServiceOverride, "id">>,
  ) {
    const existing = getService(id);
    const next = existing
      ? services.map((s) => (s.id === id ? { ...s, ...patch } : s))
      : [...services, { id, ...patch }];
    // Drop entries that only have the id key (no actual overrides)
    onServicesChange(
      next.filter((s) =>
        Object.entries(s)
          .filter(([k]) => k !== "id")
          .some(([, v]) => v !== undefined),
      ),
    );
  }

  return (
    <>
      {/* Booking & Gift */}
      <fieldset className="rounded-xl border border-fog bg-beige/60 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-mocha">
          Booking &amp; Gift
        </legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            <span className={spanClass}>Booking URL</span>
            <input
              className={inputClass}
              value={site.booking ?? ""}
              placeholder="https://booking.example.com"
              onChange={(e) => onSiteChange({ booking: e.target.value || undefined })}
            />
          </label>
          <label className={labelClass}>
            <span className={spanClass}>Booker brand</span>
            <input
              className={inputClass}
              value={booker.brand ?? ""}
              onChange={(e) => patchBooker({ brand: e.target.value || undefined })}
            />
          </label>
          <label className={labelClass}>
            <span className={spanClass}>Gift certificate URL</span>
            <input
              className={inputClass}
              value={booker.giftCertificate ?? ""}
              onChange={(e) =>
                patchBooker({ giftCertificate: e.target.value || undefined })
              }
            />
          </label>
        </div>
      </fieldset>

      {/* Services (prices) */}
      <fieldset className="rounded-xl border border-fog bg-beige/60 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-mocha">
          Services (prices)
        </legend>
        <div className="mt-3 flex flex-col gap-4">
          {SERVICE_IDS.map((id) => {
            const svc = getService(id);
            return (
              <div key={id} className="rounded-lg border border-tan bg-cream p-3">
                <p className="mb-2 text-xs font-semibold text-mocha">
                  {SERVICE_LABELS[id]}
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className={labelClass}>
                    <span className={spanClass}>Price from ($)</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      className={inputClass}
                      value={svc?.price ?? ""}
                      onChange={(e) =>
                        patchService(id, {
                          price: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                    />
                  </label>
                  <label className={labelClass}>
                    <span className={spanClass}>Price to ($)</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      className={inputClass}
                      value={svc?.priceTo ?? ""}
                      onChange={(e) =>
                        patchService(id, {
                          priceTo: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                    />
                  </label>
                  <label className={labelClass}>
                    <span className={spanClass}>Photo</span>
                    <select
                      className={inputClass}
                      value={
                        svc?.photo === undefined ? "" : svc.photo ? "true" : "false"
                      }
                      onChange={(e) =>
                        patchService(id, {
                          photo:
                            e.target.value === ""
                              ? undefined
                              : e.target.value === "true",
                        })
                      }
                    >
                      <option value="">— inherit —</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </fieldset>

      {/* Social & Reviews */}
      <fieldset className="rounded-xl border border-fog bg-beige/60 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-mocha">
          Social &amp; Reviews
        </legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="col-span-full flex flex-col gap-1 text-xs">
            <span className={spanClass}>
              Social profile URLs (one per line)
            </span>
            <textarea
              className={`${inputClass} min-h-20`}
              value={socialProfiles.join("\n")}
              onChange={(e) =>
                onSiteChange({
                  socialProfiles: e.target.value
                    ? e.target.value.split("\n").map((s) => s.trim()).filter(Boolean)
                    : undefined,
                })
              }
            />
          </label>
          <label className={labelClass}>
            <span className={spanClass}>Rating value</span>
            <input
              type="number"
              min={1}
              max={5}
              step={0.1}
              className={inputClass}
              value={reviews.ratingValue ?? ""}
              onChange={(e) =>
                patchReviews({
                  ratingValue: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </label>
          <label className={labelClass}>
            <span className={spanClass}>Review count</span>
            <input
              type="number"
              min={0}
              step={1}
              className={inputClass}
              value={reviews.reviewCount ?? ""}
              onChange={(e) =>
                patchReviews({
                  reviewCount: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </label>
          <label className={labelClass}>
            <span className={spanClass}>Best rating</span>
            <input
              type="number"
              min={1}
              max={5}
              step={1}
              className={inputClass}
              value={reviews.bestRating ?? ""}
              onChange={(e) =>
                patchReviews({
                  bestRating: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </label>
          <label className={labelClass}>
            <span className={spanClass}>Review source</span>
            <input
              className={inputClass}
              value={reviews.source ?? ""}
              placeholder="Google"
              onChange={(e) =>
                patchReviews({ source: e.target.value || undefined })
              }
            />
          </label>
          <label className={labelClass}>
            <span className={spanClass}>Geo lat</span>
            <input
              type="number"
              step="any"
              className={inputClass}
              value={geo.lat ?? ""}
              onChange={(e) =>
                patchGeo({ lat: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </label>
          <label className={labelClass}>
            <span className={spanClass}>Geo lng</span>
            <input
              type="number"
              step="any"
              className={inputClass}
              value={geo.lng ?? ""}
              onChange={(e) =>
                patchGeo({ lng: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </label>
        </div>
      </fieldset>
    </>
  );
}
