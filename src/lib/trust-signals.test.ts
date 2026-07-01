import { describe, expect, it } from "bun:test";
import { trustSignals } from "@/lib/reviews";
import type { TenantSite } from "@/config/types";

const labels = { basedOn: "from", reviewsWord: "Google reviews" };
const reviews = (
  ratingValue: number,
  reviewCount: number,
): TenantSite["reviews"] => ({
  ratingValue,
  reviewCount,
  bestRating: 5,
  source: "google",
});

// Above-fold trust signal (rating stars + count). The gate, the number format,
// and the aria-label were all duplicated across the home and service-detail
// pages — and the aria-label had already drifted (service inlined toFixed).
describe("trustSignals", () => {
  it("hides when there are no reviews (reviewCount === 0)", () => {
    expect(trustSignals("en", reviews(0, 0), labels).show).toBe(false);
  });

  it("shows when there is at least one review", () => {
    const ts = trustSignals("en", reviews(4.9, 128), labels);
    expect(ts.show).toBe(true);
  });

  it("renders the canonical one-decimal rating and grouped count", () => {
    const ts = trustSignals("en", reviews(4.9, 1234), labels);
    if (!ts.show) throw new Error("expected shown");
    expect(ts.ratingDisplay).toBe("4.9");
    expect(ts.countDisplay).toBe("1,234");
    expect(ts.bestRating).toBe(5);
  });

  it("assembles one aria-label so callers can't drift it", () => {
    const ts = trustSignals("en", reviews(4.9, 128), labels);
    if (!ts.show) throw new Error("expected shown");
    expect(ts.ariaLabel).toBe("4.9 / 5 — from 128 Google reviews");
  });
});
