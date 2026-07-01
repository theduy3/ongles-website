import { describe, expect, it } from "bun:test";
import { formatRating, formatReviewCount } from "@/lib/format";

// Rating + review-count number formatting. Single source so every caller
// renders identically — the drift these guard against is a real defect:
// Home once used toLocaleString (default 3 max decimals) while the service
// detail page used toFixed(1), so the same value could render two ways.
describe("formatRating", () => {
  it("renders exactly one decimal place", () => {
    expect(formatRating("en", 4.9)).toBe("4.9");
    expect(formatRating("en", 5)).toBe("5.0");
  });

  it("does not diverge the way toFixed(1) vs toLocaleString(min:1) did (drift regression)", () => {
    // toLocaleString(min:1) alone would give "4.85"; toFixed(1) gives "4.8".
    // Canonical pins max:1 too, so both callers now agree on "4.9".
    expect(formatRating("en", 4.85)).toBe("4.9");
    expect(formatRating("en", 4.85)).not.toBe("4.85");
  });

  it("uses en-CA regardless of locale (preserves current hardcoded behavior)", () => {
    // Both fr and en pages render en-CA today (dot decimal), not fr-CA.
    expect(formatRating("fr", 4.9)).toBe("4.9");
  });
});

describe("formatReviewCount", () => {
  it("groups thousands", () => {
    expect(formatReviewCount("en", 1234)).toBe("1,234");
  });

  it("leaves small counts ungrouped", () => {
    expect(formatReviewCount("en", 128)).toBe("128");
  });

  it("uses en-CA grouping regardless of locale (preserves current behavior)", () => {
    expect(formatReviewCount("fr", 1234)).toBe("1,234");
  });
});
