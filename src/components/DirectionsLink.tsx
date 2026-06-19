"use client";

import { ga4Events } from "@/lib/gtag";

// ─── Exported click-handler factory ──────────────────────────────────────────
// Pure function exported so bun:test can unit-test it without a DOM renderer.

/** Returns an onClick handler that fires ga4Events.directionsClick. */
export function makeDirectionsClickHandler(salonLocation: string): () => void {
  return () => ga4Events.directionsClick(salonLocation);
}

// ─── Props ────────────────────────────────────────────────────────────────────

export type DirectionsLinkProps = {
  href: string;
  salonLocation: string;
  children: React.ReactNode;
  className?: string;
  target?: string;
  rel?: string;
};

// ─── Island ───────────────────────────────────────────────────────────────────
// Thin client island that wraps a directions/map anchor with an onClick handler
// emitting the GA4 directions_click event (M-03). Used inside SalonCard for the
// own-location name anchor (which resolves to a Google Maps search link via
// mapLink()). Server Component callers pass all resolved props.

export function DirectionsLink({
  href,
  salonLocation,
  children,
  className,
  target,
  rel,
}: DirectionsLinkProps) {
  return (
    <a
      href={href}
      onClick={makeDirectionsClickHandler(salonLocation)}
      className={className}
      target={target}
      rel={rel}
    >
      {children}
    </a>
  );
}
