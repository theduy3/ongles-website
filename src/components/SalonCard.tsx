import { Button } from "./Button";
import {
  bookerServiceMenu,
  mapEmbedSrc,
  mapEmbedUrl,
  mapLink,
  locations,
  type DayHours,
} from "@/lib/locations";
import { sisterSalons } from "@/lib/salons";
import { site } from "@/lib/site";
import type { Dictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";

// Presentational salon card: embedded Google Map on top + name/landmark/
// address/hours/phone and a "Book Now" link. Drives both Ongles Maily locations
// (internal booker) and sister-brand salons (external site + booking), plus a
// "coming soon" variant. All data is normalized into props by buildSalonCards.
export type SalonCardProps = {
  name: string;
  nameHref?: string; // map link (Maily) or website (sister); omit → plain text
  external?: boolean; // open nameHref / book in a new tab
  landmark?: string;
  mapSrc?: string; // Google Maps embed src; omit → no iframe
  mapTitle?: string;
  address?: { line1: string; line2: string };
  hours?: DayHours[]; // already localized; omit → no hours row
  phone?: string;
  phoneHref?: string;
  bookHref?: string; // omit → no book button
  bookLabel: string;
  comingSoon?: boolean;
  comingSoonLabel?: string;
  labels: { address: string; hours: string; phone: string };
};

export function SalonCard(props: SalonCardProps) {
  const {
    name,
    nameHref,
    external,
    landmark,
    mapSrc,
    mapTitle,
    address,
    hours,
    phone,
    phoneHref,
    bookHref,
    bookLabel,
    comingSoon,
    comingSoonLabel,
    labels,
  } = props;
  const ext = external
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-card">
      <div className="relative flex aspect-[16/9] w-full items-center justify-center bg-sand">
        {mapSrc ? (
          <iframe
            src={mapSrc}
            title={mapTitle ?? name}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-full w-full border-0"
          />
        ) : comingSoon && comingSoonLabel ? (
          <span className="rounded-pill bg-espresso/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-cream">
            {comingSoonLabel}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-6">
        {nameHref ? (
          <a
            href={nameHref}
            {...ext}
            className="text-2xl text-espresso underline-offset-4 hover:underline"
          >
            {name}
          </a>
        ) : (
          <span className="text-2xl text-espresso">{name}</span>
        )}
        {landmark && <p className="mt-1 text-sm text-tan">{landmark}</p>}

        {(address || hours || phone) && (
          <dl className="mt-4 space-y-3 text-sm text-mocha">
            {address && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-espresso">
                  📍 {labels.address}
                </dt>
                <dd className="mt-0.5">
                  {address.line1}
                  <br />
                  {address.line2}
                </dd>
              </div>
            )}
            {hours && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-espresso">
                  🕐 {labels.hours}
                </dt>
                <dd className="mt-0.5">
                  {hours.map((h) => (
                    <span key={h.label} className="block">
                      {h.label}: {h.value}
                    </span>
                  ))}
                </dd>
              </div>
            )}
            {phone && phoneHref && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-espresso">
                  📞 {labels.phone}
                </dt>
                <dd className="mt-0.5">
                  <a href={phoneHref} className="hover:text-espresso">
                    {phone}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        )}

        {bookHref && (
          <div className="mt-6">
            <Button href={bookHref} className="w-full">
              {bookLabel}
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

// Build the ordered card list: Ongles Maily location(s) first (internal booker),
// then sister salons (external links), coming-soon last. Pure — safe to call
// from server or client components.
export function buildSalonCards(
  dict: Pick<Dictionary, "locations">,
  lang: Locale,
): SalonCardProps[] {
  const l = dict.locations;
  const labels = {
    address: l.labelAddress,
    hours: l.labelHours,
    phone: l.labelPhone,
  };

  const maily: SalonCardProps[] = locations.map((loc) => ({
    name: loc.name,
    nameHref: mapLink(loc),
    external: true,
    landmark: loc.landmark,
    mapSrc: mapEmbedUrl(loc),
    mapTitle: `${site.name} — ${loc.name}`,
    address: { line1: loc.address.line1, line2: loc.address.line2 },
    hours: l.hours,
    phone: loc.phone,
    phoneHref: loc.phoneHref,
    bookHref: bookerServiceMenu(loc),
    bookLabel: l.bookNow,
    labels,
  }));

  const sisters: SalonCardProps[] = sisterSalons.map((s) => ({
    name: s.brand,
    nameHref: s.website,
    external: true,
    landmark: s.landmark,
    mapSrc: s.address ? mapEmbedSrc(s.address.query) : undefined,
    mapTitle: s.brand,
    address: s.address
      ? { line1: s.address.line1, line2: s.address.line2 }
      : undefined,
    hours: s.hours?.[lang],
    phone: s.phone,
    phoneHref: s.phoneHref,
    bookHref: s.booking,
    bookLabel: l.bookNow,
    comingSoon: s.comingSoon,
    comingSoonLabel: l.comingSoon,
    labels,
  }));

  return [...maily, ...sisters];
}
