# Mobile Booking Action Dock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a compact tenant-aware mobile Call / Book / Directions dock that emphasizes booking while preserving the existing desktop CTA.

**Architecture:** Keep FloatingCTA as the server-side tenant/config resolver. Extend the existing FloatingCTAButtons client island to render desktop and mobile variants from the same resolved props, with a centralized booking-route guard. Add a pure Google Maps directions helper and localized short labels; use Playwright to verify responsive behavior.

**Tech Stack:** Next.js 16.2.6 App Router, React 19.2.4, Tailwind CSS v4, TypeScript 5, Bun test, Playwright.

**Status:** Implemented and verified on 2026-08-08 in 'codex/supabase-public-read-timeout-only'.

## Global Constraints

- The mobile dock is visible below the existing md breakpoint on every public locale page except the locale-prefixed booking route.
- The mobile order is Call Now, Book Now, Directions; Book Now is a raised gold circular action in the center.
- The mobile dock uses the approved warm white/cream palette and is approximately 74px tall before env(safe-area-inset-bottom).
- Desktop keeps the existing bottom-right Book pill and circular Call action; Directions is mobile-only.
- Book uses /{locale}{site.booking}, Call uses site.contact.phoneHref, and Directions uses a tenant-specific Google Maps dir/?api=1&destination= URL.
- English and French must have matching locale key structure; mobile labels are Call Now / Book Now / Directions and Appeler / Réserver / Itinéraire.
- Reuse the existing GA4 event helpers and preserve their no-op behavior before consent or during SSR.
- Do not add a map embed, change the booking provider, add desktop Directions, or introduce new tenant configuration fields.

## File map

- Modify src/lib/locations.ts — add the pure tenant-aware Google Maps directions URL helper.
- Modify src/lib/locations.test.ts — test default-site, injected-site, and fallback directions URLs.
- Modify src/config/base/content.en.json and src/config/base/content.fr.json — add layered base short labels.
- Modify src/dictionaries/en.json and src/dictionaries/fr.json — keep the canonical dictionary type source and French runtime shape in sync.
- Modify src/config/seo/seo-parity.test.ts — assert CTA key parity and non-empty short labels.
- Modify src/components/FloatingCTAButtons.tsx — add route normalization, responsive markup, directions analytics, and mobile dock styling.
- Modify src/components/FloatingCTAButtons.test.tsx — test booking-path normalization without requiring a DOM renderer.
- Modify src/components/FloatingCTA.tsx — pass tenant-aware book, phone, directions, label, and booking-path props; remove the old positioning wrapper.
- Create e2e/floating-cta.spec.ts — verify mobile, booking-route, desktop, tenant URL, and footer-clearance behavior.

---

### Task 1: Add the tenant-aware Google Maps directions helper

**Files:**
- Modify: src/lib/locations.test.ts
- Modify: src/lib/locations.ts

**Interfaces:**
- Produces mapDirectionsLink(loc: Location | undefined, s?: TenantSite): string.
- The URL format is https://www.google.com/maps/dir/?api=1&destination=<encoded-destination>.
- A location destination is the active site name, location name, street, and line2.
- When loc is undefined, the fallback destination uses the active site's contact address.

- [x] Step 1: Write the failing helper tests.

Extend the existing locations test imports with mapDirectionsLink. Add a suite that checks the exact encoded destination and dependency injection:

```
describe("mapDirectionsLink — dependency injection and fallback", () => {
  it("builds a Google Maps directions URL for the static tenant location", () => {
    const destination =
      staticSite.name + " " + loc.name + ", " +
      loc.address.street + ", " + loc.address.line2;

    expect(mapDirectionsLink(loc)).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=" +
        encodeURIComponent(destination),
    );
  });

  it("uses an injected tenant name in the destination", () => {
    const decoded = decodeURIComponent(mapDirectionsLink(loc, injectedSite));
    expect(decoded).toContain("Z Salon");
    expect(decoded).not.toContain(staticSite.name);
  });

  it("falls back to the injected contact address without undefined values", () => {
    const link = mapDirectionsLink(undefined, injectedSite);
    expect(link).toContain(
      "https://www.google.com/maps/dir/?api=1&destination=",
    );
    expect(decodeURIComponent(link)).toContain(
      injectedSite.contact.address.street,
    );
    expect(link).not.toContain("undefined");
  });
});
```

- [x] Step 2: Run the focused test and confirm it fails for the missing export.

Run: bun test src/lib/locations.test.ts

Expected: FAIL because mapDirectionsLink is not exported yet.

- [x] Step 3: Implement the pure helper in src/lib/locations.ts.

Add the helper beside mapLink and keep the existing one-argument default-site behavior. Reuse the
`hasCompleteDirectionsLocation` guard before reading runtime location fields so incomplete data
uses the tenant contact-address fallback:

```
export function mapDirectionsLink(
  loc: Location | undefined,
  s: TenantSite = site,
): string {
  const destination = hasCompleteDirectionsLocation(loc)
    ? s.name + " " + loc.name + ", " +
      loc.address.street + ", " + loc.address.line2
    : s.name + ", " + s.contact.address.street + ", " +
      s.contact.address.line2;

  return "https://www.google.com/maps/dir/?api=1&destination=" +
    encodeURIComponent(destination);
}
```

- [x] Step 4: Run the focused test and confirm it passes.

Run: bun test src/lib/locations.test.ts

Expected: PASS, including the existing mapLink and bookerServiceMenu tests.

- [x] Step 5: Commit the helper.

```
git add src/lib/locations.ts src/lib/locations.test.ts
git commit -m "feat: add tenant-aware maps directions helper"
```

### Task 2: Add compact English and French CTA labels

**Files:**
- Modify: src/config/seo/seo-parity.test.ts
- Modify: src/config/base/content.en.json
- Modify: src/config/base/content.fr.json
- Modify: src/dictionaries/en.json
- Modify: src/dictionaries/fr.json

**Interfaces:**
- Adds Dictionary["cta"].callNowShort, bookNowShort, and directionsShort.
- Runtime layered content and the canonical Dictionary type expose the same three keys in both locales.

- [x] Step 1: Add a failing parity and value test.

In the existing dictionary import section of src/config/seo/seo-parity.test.ts, add:

```
describe("mobile CTA labels", () => {
  it("keeps the CTA key structure identical in French and English", () => {
    expect(keyPaths(frDict.cta)).toEqual(keyPaths(enDict.cta));
  });

  it("defines non-empty compact labels in both locales", () => {
    expect(frDict.cta.callNowShort).toBe("Appeler");
    expect(frDict.cta.bookNowShort).toBe("Réserver");
    expect(frDict.cta.directionsShort).toBe("Itinéraire");
    expect(enDict.cta.callNowShort).toBe("Call Now");
    expect(enDict.cta.bookNowShort).toBe("Book Now");
    expect(enDict.cta.directionsShort).toBe("Directions");
  });
});
```

- [x] Step 2: Run the focused parity test and confirm it fails.

Run: bun test src/config/seo/seo-parity.test.ts

Expected: FAIL because the six new leaf keys do not exist yet.

- [x] Step 3: Add the three keys to all four locale JSON sources.

Add these English entries inside each English cta object:

```
"callNowShort": "Call Now",
"bookNowShort": "Book Now",
"directionsShort": "Directions"
```

Add these French entries inside each French cta object:

```
"callNowShort": "Appeler",
"bookNowShort": "Réserver",
"directionsShort": "Itinéraire"
```

Do not replace existing book, callNow, bookNow, or getDirections copy; those keys serve existing desktop and page-level CTAs.

- [x] Step 4: Run the focused parity test and confirm it passes.

Run: bun test src/config/seo/seo-parity.test.ts

Expected: PASS, including all existing SEO, FAQ, and locale parity suites.

- [x] Step 5: Commit the labels.

```
git add src/config/seo/seo-parity.test.ts src/config/base/content.en.json src/config/base/content.fr.json src/dictionaries/en.json src/dictionaries/fr.json
git commit -m "feat: add localized mobile CTA labels"
```

### Task 3: Add the route guard, responsive mobile dock, and server wiring

**Files:**
- Modify: src/components/FloatingCTAButtons.tsx
- Modify: src/components/FloatingCTAButtons.test.tsx
- Modify: src/components/FloatingCTA.tsx

**Interfaces:**
- Extends FloatingCTAButtonsProps with directionsHref, mobileCallLabel, mobileBookLabel, mobileDirectionsLabel, and bookingPath.
- Produces isBookingPath(pathname: string | null, bookingPath: string): boolean.
- FloatingCTA passes mapDirectionsLink(locations[0], site) and the locale-prefixed site.booking path.
- Reuses makeCallClickHandler, makeBookClickHandler, and makeDirectionsClickHandler for both responsive variants.

- [x] Step 1: Write failing route-normalization tests.

Import isBookingPath from the component test and add:

```
describe("isBookingPath()", () => {
  it("matches the booking route with or without a trailing slash", () => {
    expect(isBookingPath("/en/book-online", "/en/book-online")).toBe(true);
    expect(isBookingPath("/en/book-online/", "/en/book-online")).toBe(true);
  });

  it("does not hide neighboring routes or a null pathname", () => {
    expect(isBookingPath("/en/contact", "/en/book-online")).toBe(false);
    expect(isBookingPath(null, "/en/book-online")).toBe(false);
  });
});
```

- [x] Step 2: Run the focused component test and confirm it fails.

Run: bun test src/components/FloatingCTAButtons.test.tsx

Expected: FAIL because isBookingPath is not exported yet; existing event-handler tests remain the regression baseline.

- [x] Step 3: Add the path helper, client props, and directions handler wiring.

Import usePathname from next/navigation and makeDirectionsClickHandler from ./DirectionsLink. Add the new fields to the existing props type:

```
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
```

Implement the route helpers before the component:

```
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
```

Inside FloatingCTAButtons, call usePathname and return null when isBookingPath(pathname, bookingPath) is true. Keep the existing call and book handler factories; call makeDirectionsClickHandler(salonLocation) for the mobile Directions anchor.

- [x] Step 4: Render the desktop and mobile variants from the same resolved props.

Make the client island own its positioning wrappers:

- Desktop root: data-testid="floating-cta-desktop", fixed bottom-5 right-5 z-40, hidden flex-col items-end gap-3 md:flex. Keep the current Book pill and circular Call markup, hrefs, event handlers, and desktop labels.
- Mobile root: data-testid="floating-cta-mobile", fixed inset-x-0 bottom-0 z-40, grid grid-cols-3 min-h-[74px], bg-beige, border-t border-sand, shadow-card, pb-[env(safe-area-inset-bottom)], and md:hidden.
- Mobile side anchors use the phone and map-pin line icons, small localized labels, text-mocha, visible focus rings, and touch-friendly minimum heights.
- The center Book anchor uses bookHref, makeBookClickHandler(salonLocation), bg-gold, a raised -mt-4 circular shape around 60px, the calendar icon, and mobileBookLabel.
- The Directions anchor uses directionsHref, makeDirectionsClickHandler(salonLocation), and mobileDirectionsLabel.
- Add an aria-hidden flow spacer after the fixed mobile root with h-[calc(74px+env(safe-area-inset-bottom))] md:hidden. FloatingCTA is rendered after Footer in the root layout, so this spacer keeps the footer's final links above the dock.

Use the existing espresso, mocha, cream, beige, sand, and gold design tokens. Keep icon SVGs inline and mark every decorative SVG aria-hidden.

- [x] Step 5: Wire the server component in the same task.

Update src/components/FloatingCTA.tsx to import mapDirectionsLink, remove the fixed bottom-right parent wrapper, and pass the complete prop set:

```
const bookingPath = "/" + locale + site.booking;
const salonLocation = locations[0]?.name ?? site.name;

return (
  <FloatingCTAButtons
    bookHref={bookingPath}
    phoneHref={site.contact.phoneHref}
    directionsHref={mapDirectionsLink(locations[0], site)}
    bookLabel={dict.cta.book}
    callLabel={dict.cta.callNow}
    mobileBookLabel={dict.cta.bookNowShort}
    mobileCallLabel={dict.cta.callNowShort}
    mobileDirectionsLabel={dict.cta.directionsShort}
    bookingPath={bookingPath}
    salonLocation={salonLocation}
  />
);
```

This replaces the current hard-coded /{locale}/book-online value while preserving existing desktop labels and the active tenant phone.

- [x] Step 6: Run focused tests and confirm the combined client/server contract passes.

Run: bun test src/components/FloatingCTAButtons.test.tsx

Expected: PASS for the route guard, existing Book and Call analytics tests, and SSR/pre-consent no-op tests.

- [x] Step 7: Commit the complete CTA implementation.

```
git add src/components/FloatingCTA.tsx src/components/FloatingCTAButtons.tsx src/components/FloatingCTAButtons.test.tsx
git commit -m "feat: add booking-focused mobile CTA dock"
```

### Task 4: Add responsive browser coverage

**Files:**
- Create: e2e/floating-cta.spec.ts

**Interfaces:**
- Browser tests select data-testid="floating-cta-mobile" and data-testid="floating-cta-desktop".
- The mobile test viewport is 390 by 844; the desktop test viewport is 1280 by 800.

- [x] Step 1: Create e2e/floating-cta.spec.ts with the responsive behavior cases.

```
import { test, expect } from "@playwright/test";

test.describe("floating CTA responsive behavior", () => {
  test("shows a compact tenant-aware mobile dock", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en");

    const dock = page.getByTestId("floating-cta-mobile");
    await expect(dock).toBeVisible();
    await expect(dock.getByRole("link", { name: "Call Now" })).toHaveAttribute(
      "href",
      "tel:+14186608228",
    );
    await expect(dock.getByRole("link", { name: "Book Now" })).toHaveAttribute(
      "href",
      "/en/book-online",
    );

    const directions = dock.getByRole("link", { name: "Directions" });
    const directionsHref = await directions.getAttribute("href");
    expect(directionsHref).toMatch(
      /google\.com\/maps\/dir\/\?api=1&destination=/,
    );
    expect(decodeURIComponent(directionsHref ?? "")).toContain("Ongles Maily");
    await expect(page.getByTestId("floating-cta-desktop")).toBeHidden();
  });

  test("hides the CTA on the booking route", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/book-online/");
    await expect(page.getByTestId("floating-cta-mobile")).toHaveCount(0);
    await expect(page.getByTestId("floating-cta-desktop")).toHaveCount(0);
  });

  test("keeps the existing desktop controls", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/en");
    const desktop = page.getByTestId("floating-cta-desktop");
    await expect(desktop).toBeVisible();
    await expect(
      desktop.getByRole("link", { name: "Book Online" }),
    ).toBeVisible();
    await expect(page.getByTestId("floating-cta-mobile")).toBeHidden();
  });

  test("keeps the footer clear of the mobile dock", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en");
    const privacy = page.getByRole("link", { name: "Privacy Policy" });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const box = await privacy.boundingBox();
    expect(box).not.toBeNull();
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThan(844 - 74);
  });
});
```

- [x] Step 2: Run the focused browser spec.

Run: bunx playwright test e2e/floating-cta.spec.ts

Expected: PASS for mobile visibility, tenant-specific hrefs, booking-route exclusion, desktop preservation, and footer clearance.

- [x] Step 3: Commit the browser coverage.

```
git add e2e/floating-cta.spec.ts
git commit -m "test: cover responsive floating CTA behavior"
```

### Task 5: Run the full verification gate

**Files:**
- No source changes expected; inspect the complete diff and test results.

- [x] Step 1: Run all unit and component tests.

Run: bun test src/

Expected: PASS with no locale-parity, analytics, map-helper, or route-guard regressions.

- [x] Step 2: Run lint.

Run: npm run lint

Expected: PASS with no React, Next.js, accessibility, or Tailwind class errors.

- [x] Step 3: Run the full production browser suite.

Run: npm run test:e2e

Expected: PASS with the new floating CTA suite and all existing production-build browser tests.

- [x] Step 4: Inspect the final diff and working tree.

Run:

```
git diff HEAD~4 --stat
git diff HEAD~4 --check
git status --short
```

Expected: only the planned CTA, helper, locale, test, and e2e files are committed; no production secrets or unrelated changes are present.

- [x] Step 5: Run the production build once more if the browser suite reused an existing server.

Run: npm run build

Expected: PASS with both locale dictionaries and all tenant configurations type-checking successfully.
