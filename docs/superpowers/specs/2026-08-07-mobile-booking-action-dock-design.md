# Mobile Booking Action Dock

Date: 2026-08-07
Status: Approved design; implementation plan pending

## Context

The site already renders a sitewide `FloatingCTA` with Book and Call actions. It is resolved by the active tenant and rendered from `src/app/[lang]/layout.tsx`; the interactive anchor markup lives in the client island `src/components/FloatingCTAButtons.tsx`.

The requested mobile experience is a persistent three-action dock that makes booking the primary action. The dock must work for every public page except the booking page and must resolve phone, booking, and directions destinations from the active tenant rather than from hard-coded Ongles Maily values.

## Approved behavior

### Mobile

Below the existing `md` breakpoint, render a fixed full-width bottom dock with this order:

1. Call Now
2. Book Now
3. Directions

The dock uses the warm site palette from the earlier mobile design:

- warm white/beige surface with a subtle top border and shadow;
- espresso/mocha text and line icons for the side actions;
- a compact gold circular Book Now action raised slightly above the dock;
- icon above a small localized label for every action;
- approximately 74px of dock height before the device safe-area inset, with tight vertical spacing so the bar does not feel thick;
- safe-area padding via `env(safe-area-inset-bottom)` on devices that provide it.

The dock is visible on every public locale page except the locale-prefixed booking route. The booking-page exclusion is handled centrally by the CTA client island rather than by adding page-specific conditions to every route.

### Desktop

Keep the existing desktop bottom-right controls unchanged: the Book pill and circular Call action remain available at desktop widths. Directions is a mobile-only action for this feature. The CTA is hidden on the booking route at all widths.

### Page clearance

The page shell must reserve the dock’s visual height plus the safe-area inset, including content near the footer. Fixed actions must not cover readable page content, footer links, or focus targets.

## Component and data flow

`FloatingCTA` remains a server component and continues to call `getStoreConfig()` once to resolve the active tenant’s `site` and primary location.

It passes the following resolved values to `FloatingCTAButtons`:

- `bookHref`: `/${locale}${site.booking}`;
- `phoneHref`: `site.contact.phoneHref`;
- `directionsHref`: a tenant-specific Google Maps directions URL built from the active site and primary location;
- the existing salon location name used by analytics;
- desktop labels and the new compact mobile labels;
- the normalized booking pathname used for the central route exclusion.

`FloatingCTAButtons` remains the only client island for CTA interactions. It renders two responsive variants:

- the existing desktop floating markup, shown at desktop widths;
- the new compact mobile dock, shown below the desktop breakpoint.

Both variants use the same resolved URLs and click-handler factories, so desktop and mobile cannot drift to different destinations or analytics behavior.

## Tenant-specific destinations

Add a directions helper beside the existing map helpers in `src/lib/locations.ts`. The helper will build a Google Maps directions URL using the active tenant name and primary location address in the form `https://www.google.com/maps/dir/?api=1&destination=<encoded-destination>`. It must accept the tenant site as an argument, just like the existing `mapLink` helper, so every tenant receives its own destination.

The primary source is `locations[0]`. The resolver will defensively construct the destination from `site.contact.address` if an unexpected runtime override leaves the primary location incomplete; it must never emit a URL containing `undefined`. Static tenant configuration and existing invariants remain the normal correctness guard.

The Directions anchor will be a normal external link without a forced new-tab target, allowing mobile browsers to hand off to the installed Google Maps app naturally.

## Localization

Add compact CTA labels to both English and French sources, keeping identical key structure:

- English: `Call Now`, `Book Now`, `Directions`;
- French: `Appeler`, `Réserver`, `Itinéraire`.

Use the explicit short-label keys `callNowShort`, `bookNowShort`, and `directionsShort` under `cta` so the new mobile copy does not change existing desktop or page-level CTA wording.

Update `src/dictionaries/en.json`, `src/dictionaries/fr.json`, `src/config/base/content.en.json`, and `src/config/base/content.fr.json`. Tenant content inherits these base keys unless a tenant intentionally overrides them. Locale parity tests must continue to pass.

## Analytics and accessibility

Reuse the existing event behavior:

- Call invokes `makeCallClickHandler(phoneHref)` and emits `call_click`;
- Book invokes `makeBookClickHandler(salonLocation)` and emits `book_online_click`;
- Directions invokes the existing directions handler with the resolved salon location and emits `directions_click`.

Each action remains an actual anchor with its resolved `href`, visible text, and an icon marked `aria-hidden`. Focus-visible styling must remain visible against the warm dock and gold booking control. The side actions and central booking action must provide touch targets appropriate for mobile interaction; the compact visual treatment must not reduce usability in pursuit of height.

## Error handling and route behavior

The CTA must render safely during SSR and before analytics consent, matching the existing no-op behavior of the event helpers. A missing `window.gtag` must not prevent navigation.

Booking-page detection should normalize a trailing slash before comparing the current pathname to the locale-prefixed `site.booking` path. This prevents the dock from reappearing at `/book-online/` while the canonical route is `/book-online`.

The static configuration guarantees a usable phone, booking path, and primary location. If a malformed runtime override is encountered, the direction destination uses available tenant contact fields and never throws during render. No unrelated config validation or tenant migration is in scope.

## Verification plan

Add or extend tests for:

1. `src/lib/locations.test.ts`
   - Google Maps directions URLs encode the active tenant and address;
   - an injected tenant site produces a different destination from the default tenant;
   - the fallback address path does not emit `undefined`.
2. `src/components/FloatingCTAButtons.test.tsx`
   - the Directions handler emits `directions_click` with the salon location;
   - existing Call and Book handler behavior remains unchanged;
   - booking-path normalization correctly hides the CTA on both slash forms.
3. Locale/config parity tests
   - all new short-label keys exist in English and French sources with matching structure.
4. Mobile/desktop browser coverage using the existing Playwright setup
   - the three-action dock is visible on a public mobile page;
   - Book is the visually emphasized center action;
   - the dock is absent on the booking page;
   - the current desktop Book and Call controls remain present at desktop width;
   - content and footer controls remain reachable above the dock.

The implementation is complete when these checks pass together with the repository’s normal lint and test commands.

## Scope boundaries

This change does not redesign the desktop CTA, add a Directions control to desktop, add a new map embed, change booking-provider behavior, or introduce new tenant configuration fields. It only adds the responsive mobile dock, tenant-aware direction resolution, compact localized labels, route exclusion, and the supporting tests.
