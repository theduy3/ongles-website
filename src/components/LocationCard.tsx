import { Button } from "./Button";
import {
  bookerServiceMenu,
  mapEmbedUrl,
  mapLink,
  type Location,
} from "@/lib/locations";
import type { Dictionary } from "@/lib/dictionary";

// One salon location: embedded Google Map + address, hours, phone and a Booker
// "Book Now" link. Server component (the map is a plain iframe, no API key).
export function LocationCard({
  loc,
  dict,
}: {
  loc: Location;
  dict: Pick<Dictionary, "locations">;
}) {
  const l = dict.locations;
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-fog bg-beige shadow-sm">
      <div className="relative aspect-[16/10] w-full bg-fog">
        <iframe
          src={mapEmbedUrl(loc)}
          title={`Map of Pure Nail Bar — ${loc.name}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="h-full w-full border-0"
        />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-2xl text-espresso">{loc.name}</h3>
        {loc.landmark && (
          <p className="mt-1 text-sm text-tan">{loc.landmark}</p>
        )}

        <dl className="mt-4 space-y-3 text-sm text-mocha">
          <div>
            <dt className="font-semibold text-espresso">📍 {l.labelAddress}</dt>
            <dd className="mt-0.5">
              {loc.address.line1}
              <br />
              {loc.address.line2}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-espresso">🕐 {l.labelHours}</dt>
            <dd className="mt-0.5">
              {loc.hours.map((h) => (
                <span key={h.label} className="block">
                  {h.label}: {h.value}
                </span>
              ))}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-espresso">📞 {l.labelPhone}</dt>
            <dd className="mt-0.5">
              <a href={loc.phoneHref} className="hover:text-espresso">
                {loc.phone}
              </a>
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button href={bookerServiceMenu(loc)}>{l.bookNow}</Button>
          <a
            href={mapLink(loc)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-espresso underline-offset-4 hover:underline"
          >
            {l.getDirections}
          </a>
        </div>
      </div>
    </article>
  );
}
