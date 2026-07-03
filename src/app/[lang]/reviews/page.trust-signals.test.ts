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
// These per-page tripwires assert the POSITIVE facts local to /reviews:
//   - The R-02 display gate flows through trust.show.
//   - Rating display routes through trustSignals().
//
// The NEGATIVE invariant — "no page reintroduces a hardcoded-locale
// toLocaleString" (the original en-CA "4.9" vs "4,9" regression) — is no longer
// re-listed here. It is owned repo-wide by presenter-source.tripwire.test.ts,
// which derives its coverage from every page.tsx, so a new page is guarded the
// moment it exists.

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
});
