import { test, expect } from "@playwright/test";

// Trust-signal render coverage — the rating renders in the LOCALE-CORRECT format
// on every surface that shows it, through the real interface (a running page),
// not just guarded at source by presenter-source.tripwire.test.ts.
//
// The regression this locks end-to-end: a page inlining `toLocaleString("en-CA")`
// pinned the decimal separator so FR rendered "3.9" instead of "3,9" — the exact
// divergence the formatRating / trustSignals presenters exist to prevent. The
// source tripwire proves each page ROUTES through the presenter; this proves the
// rendered output is actually right per locale, on all three trust-signal
// surfaces (homepage reviews band, /reviews aggregate, service detail).
//
// Runs against the pinned e2e tenant (ongles-maily, ratingValue 3.9 — see
// playwright.config webServer env). Unlike the inherited SS-clone specs, this is
// written for the tenant this repo actually serves, so it is green today.

const RATING = {
  // ongles-maily aggregate rating, formatted per locale by formatRating (`${lang}-CA`).
  fr: /3,9/, // comma decimal — FR must NOT render "3.9"
  en: /3\.9/, // dot decimal
} as const;

// The three surfaces that render trustSignals(), with a service slug per locale.
const surfaces: Record<string, { path: (code: string) => string; label: string }> = {
  homepage: { path: (c) => `/${c}`, label: "homepage reviews band" },
  reviews: { path: (c) => `/${c}/reviews`, label: "reviews aggregate" },
  service: {
    path: (c) => `/${c}/services/${c === "fr" ? "pose-d-ongles" : "nail-enhancements"}`,
    label: "service-detail trust signal",
  },
};

for (const code of ["fr", "en"] as const) {
  test.describe(`trust signal renders localized rating (${code})`, () => {
    for (const { path, label } of Object.values(surfaces)) {
      test(`${label}`, async ({ page }) => {
        await page.goto(path(code));
        await expect(page.getByText(RATING[code]).first()).toBeVisible();
        // Guard the divergence directly: the FR surfaces must not render the
        // dot-decimal form of the same rating, and EN must not render the comma.
        const wrong = code === "fr" ? "3.9" : "3,9";
        await expect(page.getByText(wrong, { exact: false })).toHaveCount(0);
      });
    }
  });
}
