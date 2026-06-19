// NearMeDetails — local NAP + landmark + hours + service-link panel.
// Server component (no "use client") — static data only, renders on the server.
// Reuses shadow-card + spacing tokens from the existing design system;
// no new visual primitives (UI-SPEC §C, P-19, no map embed required this phase).

import type { Location, TenantSite, Service } from "@/config/types";
import type { Locale } from "@/lib/i18n";
import { servicePath } from "@/lib/services";
import Link from "next/link";

type Props = {
  lang: Locale;
  location: Location;
  site: TenantSite;
  services: readonly Service[];
  serviceNames: Record<string, string>; // serviceId → human-readable name
};

export function NearMeDetails({ lang, location, site, services, serviceNames }: Props) {
  const bookHref = `/${lang}${site.booking}`;

  return (
    <section aria-label="Informations pratiques" className="mx-auto max-w-3xl px-6 py-8 md:py-12">
      <div className="rounded-2xl bg-white shadow-card p-6 md:p-8 space-y-6">

        {/* NAP — Name, Address, Phone */}
        <div>
          <h2 className="text-2xl text-espresso md:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
            {site.name}
          </h2>
          {location.landmark && (
            <p className="mt-1 text-sm uppercase tracking-wide text-tan">
              {location.landmark}
            </p>
          )}
          <address className="mt-3 not-italic text-mocha leading-relaxed">
            <span className="block">{location.address.line1}</span>
            {location.address.line2 && (
              <span className="block">{location.address.line2}</span>
            )}
            <span className="block">
              {location.address.city}, {location.address.region}{" "}
              {location.address.postalCode}
            </span>
          </address>
          <a
            href={location.phoneHref}
            className="mt-2 inline-block text-mocha underline underline-offset-2 hover:text-espresso"
          >
            {location.phone}
          </a>
        </div>

        {/* Hours */}
        {location.hours.length > 0 && (
          <div>
            <h3 className="text-lg text-espresso" style={{ fontFamily: "var(--font-display)" }}>
              {lang === "fr" ? "Heures d'ouverture" : "Opening hours"}
            </h3>
            <ul className="mt-2 space-y-1">
              {location.hours.map((row, i) => (
                <li key={i} className="text-sm text-mocha">
                  {row.label} : {row.value}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Services — compact link list */}
        {services.length > 0 && (
          <div>
            <h3 className="text-lg text-espresso" style={{ fontFamily: "var(--font-display)" }}>
              {lang === "fr" ? "Nos services" : "Our services"}
            </h3>
            <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
              {services.map((svc) => (
                <li key={svc.id}>
                  <Link
                    href={`/${lang}${servicePath(svc, lang)}`}
                    className="text-sm text-tan underline underline-offset-2 hover:text-espresso"
                  >
                    {serviceNames[svc.id] ?? svc.id}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Book CTA */}
        <div className="pt-2">
          <a
            href={bookHref}
            className="inline-flex items-center rounded-full bg-espresso px-6 py-3 text-sm text-white hover:opacity-90 transition-opacity"
          >
            {lang === "fr" ? "Réserver en ligne" : "Book Online"}
          </a>
        </div>
      </div>
    </section>
  );
}
