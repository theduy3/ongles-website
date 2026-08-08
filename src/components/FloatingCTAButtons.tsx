"use client";

import { ga4Events } from "@/lib/gtag";
import { usePathname } from "next/navigation";
import { makeDirectionsClickHandler } from "./DirectionsLink";

// ─── Exported click-handler factories ─────────────────────────────────────────
// Pure functions so bun:test can import and unit-test them without a DOM renderer.

/** Returns an onClick handler that fires ga4Events.bookOnlineClick. */
export function makeBookClickHandler(salonLocation: string): () => void {
  return () => ga4Events.bookOnlineClick(salonLocation);
}

/** Returns an onClick handler that fires ga4Events.callClick. */
export function makeCallClickHandler(phoneHref: string): () => void {
  return () => ga4Events.callClick(phoneHref);
}

// ─── Props ────────────────────────────────────────────────────────────────────

export type FloatingCTAButtonsProps = {
  bookHref: string;
  phoneHref: string;
  directionsHref: string;
  bookLabel: string;
  callLabel: string;
  mobileBookLabel: string;
  mobileCallLabel: string;
  mobileDirectionsLabel: string;
  bookingPath: string;
  salonLocation: string;
};

function normalizePathname(pathname: string): string {
  const normalized = pathname.replace(/\/+$/, "");
  return normalized || "/";
}

export function isBookingPath(
  pathname: string | null,
  bookingPath: string,
): boolean {
  return pathname !== null &&
    normalizePathname(pathname) === normalizePathname(bookingPath);
}

// ─── Island ───────────────────────────────────────────────────────────────────
// FloatingCTA.tsx resolves tenant config; this island owns route visibility,
// responsive positioning, and analytics-enabled action controls.

export function FloatingCTAButtons({
  bookHref,
  phoneHref,
  directionsHref,
  bookLabel,
  callLabel,
  mobileBookLabel,
  mobileCallLabel,
  mobileDirectionsLabel,
  bookingPath,
  salonLocation,
}: FloatingCTAButtonsProps) {
  const pathname = usePathname();

  if (isBookingPath(pathname, bookingPath)) {
    return null;
  }

  return (
    <>
      <div
        data-testid="floating-cta-desktop"
        className="fixed bottom-5 right-5 z-40 hidden flex-col items-end gap-3 md:flex"
      >
        <a
          href={bookHref}
          onClick={makeBookClickHandler(salonLocation)}
          className="inline-flex items-center gap-2 rounded-pill bg-espresso px-6 py-3 text-xs font-semibold uppercase tracking-wide text-cream shadow-card transition-colors hover:bg-mocha"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4"
            aria-hidden
          >
            <path
              d="M5 12h14M13 6l6 6-6 6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {bookLabel}
        </a>
        <a
          href={phoneHref}
          aria-label={callLabel}
          onClick={makeCallClickHandler(phoneHref)}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gold text-white shadow-card transition-opacity hover:opacity-90"
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5"
            aria-hidden
          >
            <path d="M6.62 10.79a15.46 15.46 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.24.2 2.45.57 3.57a1 1 0 01-.24 1.02l-2.21 2.2z" />
          </svg>
        </a>
      </div>

      <div
        data-testid="floating-cta-mobile"
        className="fixed inset-x-0 bottom-0 z-40 grid min-h-[74px] grid-cols-3 border-t border-sand bg-beige pb-[env(safe-area-inset-bottom)] shadow-card md:hidden"
      >
        <a
          href={phoneHref}
          onClick={makeCallClickHandler(phoneHref)}
          className="flex min-h-[74px] flex-col items-center justify-center gap-1 px-2 py-2 text-xs font-semibold text-mocha transition-colors hover:text-espresso focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-espresso"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-5 w-5"
            aria-hidden
          >
            <path
              d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{mobileCallLabel}</span>
        </a>

        <a
          href={bookHref}
          onClick={makeBookClickHandler(salonLocation)}
          className="-mt-4 flex h-[60px] w-[60px] flex-col items-center justify-center gap-0.5 self-start justify-self-center rounded-full bg-gold text-[10px] font-semibold leading-none text-espresso shadow-card transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-espresso focus-visible:ring-offset-2 focus-visible:ring-offset-beige"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-5 w-5"
            aria-hidden
          >
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path
              d="M16 3v4M8 3v4M3 11h18"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{mobileBookLabel}</span>
        </a>

        <a
          href={directionsHref}
          onClick={makeDirectionsClickHandler(salonLocation)}
          className="flex min-h-[74px] flex-col items-center justify-center gap-1 px-2 py-2 text-xs font-semibold text-mocha transition-colors hover:text-espresso focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-espresso"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-5 w-5"
            aria-hidden
          >
            <path
              d="M21 10c0 7-9 12-9 12S3 17 3 10a9 9 0 1118 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>{mobileDirectionsLabel}</span>
        </a>
      </div>
      <div
        aria-hidden
        className="h-[calc(74px+env(safe-area-inset-bottom))] md:hidden"
      />
    </>
  );
}
