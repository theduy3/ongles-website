/**
 * gtag.ts — Pure browser analytics event helper.
 *
 * PURE MODULE: no React imports, no module-level side effects.
 * Safe to import from both client islands and bun:test (no DOM bootstrap needed
 * since calls are guarded by window.gtag optional chaining).
 *
 * Usage:
 *   import { gtagEvent, ga4Events } from "@/lib/gtag";
 *   ga4Events.bookOnlineClick("Beauport");  // primary M-04 key event
 *   ga4Events.callClick("(418) 660-8228");   // secondary engagement event
 */

// ─── Global augmentation ───────────────────────────────────────────────────────
// Declare gtag and dataLayer on the global Window without importing DOM libs.
// These are set by the GA4 `<Script>` snippet wired in layout.tsx (05-03).

declare global {
  interface Window {
    // GA4 command queue function injected by the inline gtag snippet.
    gtag?: (command: string, ...args: unknown[]) => void;
    // Raw dataLayer array that gtag writes to.
    dataLayer?: unknown[];
  }
}

// ─── Core emitter ─────────────────────────────────────────────────────────────

/**
 * Emit a GA4 event via window.gtag.
 * No-op (no throw) when window.gtag is not defined — safe during SSR and before
 * the consent banner resolves.
 *
 * @param name   GA4 event name (snake_case per GA4 convention).
 * @param params Optional event parameters merged into the GA4 event payload.
 */
export function gtagEvent(
  name: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", name, params);
  }
}

// ─── M-03 Conversion event emitters ───────────────────────────────────────────
// Four events per CONTEXT.md M-03 decision:
//   book_online_click  — primary key event (M-04 / conversion)
//   call_click         — secondary engagement
//   contact_form_submit — secondary engagement
//   directions_click   — secondary engagement
//
// event_category 'conversion' is set only on the primary key event so GA4
// custom channel grouping can pivot on it.

/** Primary M-04 key event — user taps the book-online CTA. */
function bookOnlineClick(salonLocation: string): void {
  gtagEvent("book_online_click", {
    event_category: "conversion",
    salon_location: salonLocation,
  });
}

/** Secondary engagement event — user taps the tel: phone link. */
function callClick(phone: string): void {
  gtagEvent("call_click", {
    event_category: "engagement",
    phone,
  });
}

/** Secondary engagement event — user submits the contact form. */
function contactFormSubmit(): void {
  gtagEvent("contact_form_submit", {
    event_category: "engagement",
  });
}

/** Secondary engagement event — user taps a directions / map link. */
function directionsClick(salonLocation: string): void {
  gtagEvent("directions_click", {
    event_category: "engagement",
    salon_location: salonLocation,
  });
}

/**
 * Typed M-03 conversion event emitters.
 * Import as: `import { ga4Events } from "@/lib/gtag";`
 */
export const ga4Events = {
  bookOnlineClick,
  callClick,
  contactFormSubmit,
  directionsClick,
} as const;
