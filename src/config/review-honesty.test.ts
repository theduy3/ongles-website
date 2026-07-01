import { describe, it, expect } from "bun:test";
import {
  RATING_MIN_REVIEWS,
  shouldPublishRating,
  shouldPublishReviewNodes,
  reviewDataFor,
} from "@/config/review-honesty";
import type { ReviewData, TenantConfig } from "@/config/types";

// Minimal ReviewData builder — only the gate-relevant fields matter here.
const rd = (o: {
  fetchedAt: string | null;
  aggregate?: { ratingValue: number; reviewCount: number };
  reviews?: readonly unknown[];
}): ReviewData => ({
  fetchedAt: o.fetchedAt,
  aggregate: o.aggregate ?? { ratingValue: 0, reviewCount: 0 },
  reviews: o.reviews ?? [],
});

describe("shouldPublishRating (R-02 rating gate)", () => {
  it("suppresses when fetchedAt is null, even with a high count", () => {
    expect(shouldPublishRating(rd({ fetchedAt: null, aggregate: { ratingValue: 4.9, reviewCount: 120 } }))).toBe(false);
  });
  it("suppresses at the boundary just below the minimum (count = 4)", () => {
    expect(shouldPublishRating(rd({ fetchedAt: "2026-01-01T00:00:00Z", aggregate: { ratingValue: 4.8, reviewCount: 4 } }))).toBe(false);
  });
  it("emits at exactly the minimum (count = 5)", () => {
    expect(shouldPublishRating(rd({ fetchedAt: "2026-01-01T00:00:00Z", aggregate: { ratingValue: 4.7, reviewCount: 5 } }))).toBe(true);
  });
  it("pins the threshold at 5", () => {
    expect(RATING_MIN_REVIEWS).toBe(5);
  });
});

describe("shouldPublishReviewNodes (review-body gate)", () => {
  it("suppresses when fetchedAt is null even if bodies are present", () => {
    expect(shouldPublishReviewNodes(rd({ fetchedAt: null, reviews: [{}] }))).toBe(false);
  });
  it("suppresses when no bodies exist", () => {
    expect(shouldPublishReviewNodes(rd({ fetchedAt: "2026-01-01T00:00:00Z", reviews: [] }))).toBe(false);
  });
  it("emits with at least one genuinely fetched body", () => {
    expect(shouldPublishReviewNodes(rd({ fetchedAt: "2026-01-01T00:00:00Z", reviews: [{}] }))).toBe(true);
  });
});

describe("reviewDataFor", () => {
  it("returns the tenant's reviewData record (the single gate source)", () => {
    const data = rd({ fetchedAt: "x", aggregate: { ratingValue: 4.5, reviewCount: 9 }, reviews: [{}] });
    const fakeTenant = { reviewData: data } as unknown as TenantConfig;
    expect(reviewDataFor(fakeTenant)).toBe(data);
  });
});
