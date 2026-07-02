import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

// Source tripwire tests for the aggregate-rating block on the /reviews page.
//
// The reviews page is an async Server Component — DOM rendering is not
// available in bun:test. We verify structural correctness via source-level
// assertions, mirroring the home and service-detail trust-signal tripwires.
//
// This page's aggregate block (rating / bestRating + "based on N reviews") is a
// Trust signal: the R-02-adjacent display gate + the canonical locale-aware
// number format. That format is owned by trustSignals() (@/lib/reviews); the
// page MUST render through it rather than reimplementing toLocaleString.
//
// Regression this locks: the page had inlined `toLocaleString("en-CA", …)`,
// pinning the locale to en-CA so FR rendered "4.9" instead of "4,9" — the exact
// divergence trustSignals() exists to prevent. These tripwires fail if:
//   - The page reintroduces a hardcoded locale in a toLocaleString call.
//   - The R-02 display gate stops flowing through trust.show.
//   - The page stops routing rating display through trustSignals().

const reviewsSource = readFileSync(
  new URL("./page.tsx", import.meta.url),
  "utf8",
);

describe("/reviews page — aggregate-rating trust signal", () => {
  test("routes the rating block through trustSignals() (not inline formatting)", () => {
    expect(reviewsSource).toContain("trustSignals");
  });

  test("display gate flows through trust.show (gate owned by trustSignals)", () => {
    expect(reviewsSource).toContain("trust.show");
  });

  test("does not hardcode a locale in toLocaleString (FR must render 4,9)", () => {
    // The defect was `toLocaleString("en-CA", …)`. Any hardcoded language tag
    // passed to toLocaleString reintroduces the divergence; formatting must be
    // locale-aware via the presenter, which uses `${lang}-CA`.
    expect(reviewsSource).not.toMatch(/toLocaleString\(\s*["'][a-z]{2}-[A-Z]{2}["']/);
  });
});
