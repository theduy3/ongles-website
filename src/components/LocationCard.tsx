import { Button } from "./Button";
import {
  bookerServiceMenu,
  mapEmbedUrl,
  mapLink,
  type Location,
} from "@/lib/locations";
import { site } from "@/lib/site";
import type { Dictionary } from "@/lib/dictionary";

// One salon location: embedded Google Map on top + address/hours/phone/landmark
// and a Booker "Book Now" link. Server component (the map is a keyless iframe).
export function LocationCard({
  loc,
  dict,
}: {
  loc: Location;
  dict: Pick<Dictionary, "locations">;
}) {
  const l = dict.locations;
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-card">
      <div className="relative aspect-[16/9] w-full bg-sand">
        <iframe
          src={mapEmbedUrl(loc)}
          title={`${site.name} — ${loc.name}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="h-full w-full border-0"
        />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <a
          href={mapLink(loc)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-2xl text-espresso underline-offset-4 hover:underline"
        >
          {loc.name}
        </a>
        {loc.landmark && (
          <p className="mt-1 text-sm text-tan">{loc.landmark}</p>
        )}

        <dl className="mt-4 space-y-3 text-sm text-mocha">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-espresso">
              📍 {l.labelAddress}
            </dt>
            <dd className="mt-0.5">
              {loc.address.line1}
              <br />
              {loc.address.line2}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-espresso">
              🕐 {l.labelHours}
            </dt>
            <dd className="mt-0.5">
              {/* Hours sourced from dict so labels are locale-aware.
                  TODO: move to per-location locale-keyed data once sister salons are added. */}
              {l.hours.map((h) => (
                <span key={h.label} className="block">
                  {h.label}: {h.value}
                </span>
              ))}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-espresso">
              📞 {l.labelPhone}
            </dt>
            <dd className="mt-0.5">
              <a href={loc.phoneHref} className="hover:text-espresso">
                {loc.phone}
              </a>
            </dd>
          </div>
        </dl>

        <div className="mt-6">
          <Button href={bookerServiceMenu(loc)} className="w-full">
            {l.bookNow}
          </Button>
        </div>
      </div>
    </article>
  );
}
