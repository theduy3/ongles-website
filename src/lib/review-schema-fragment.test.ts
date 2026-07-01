import { describe, it, expect } from "bun:test";
import { reviewSchemaFragment } from "@/lib/seo";
import type { ReviewData } from "@/config/types";

const body = (i: number) => ({
  id: `r${i}`,
  author: `Author ${i}`,
  rating: 5,
  dateISO: "2025-11-03",
  lang: "fr",
  text: `Great service ${i}`,
});

const rd = (o: {
  fetchedAt: string | null;
  aggregate?: { ratingValue: number; reviewCount: number };
  reviews?: readonly unknown[];
}): ReviewData => ({
  fetchedAt: o.fetchedAt,
  aggregate: o.aggregate ?? { ratingValue: 0, reviewCount: 0 },
  reviews: o.reviews ?? [],
});

describe("reviewSchemaFragment", () => {
  it("omits aggregateRating when the rating gate suppresses (fetchedAt null)", () => {
    const out = reviewSchemaFragment({
      reviewData: rd({ fetchedAt: null, aggregate: { ratingValue: 4.9, reviewCount: 120 } }),
      bestRating: 5,
    });
    expect("aggregateRating" in out).toBe(false);
  });

  it("emits aggregateRating from reviewData.aggregate with bestRating", () => {
    const out = reviewSchemaFragment({
      reviewData: rd({ fetchedAt: "2026-01-01T00:00:00Z", aggregate: { ratingValue: 4.7, reviewCount: 87 } }),
      bestRating: 5,
    });
    expect(out.aggregateRating).toEqual({
      "@type": "AggregateRating",
      ratingValue: 4.7,
      reviewCount: 87,
      bestRating: 5,
    });
  });

  it("omits review nodes when no bodies exist", () => {
    const out = reviewSchemaFragment({
      reviewData: rd({ fetchedAt: "2026-01-01T00:00:00Z", aggregate: { ratingValue: 4.7, reviewCount: 87 }, reviews: [] }),
      bestRating: 5,
    });
    expect("review" in out).toBe(false);
  });

  it("emits review nodes capped at MAX_REVIEW_NODES (12) with mapped shape", () => {
    const reviews = Array.from({ length: 15 }, (_, i) => body(i));
    const out = reviewSchemaFragment({
      reviewData: rd({ fetchedAt: "2026-01-01T00:00:00Z", aggregate: { ratingValue: 4.7, reviewCount: 87 }, reviews }),
      bestRating: 5,
    });
    const nodes = out.review as Record<string, unknown>[];
    expect(nodes).toHaveLength(12);
    expect(nodes[0]).toEqual({
      "@type": "Review",
      author: { "@type": "Person", name: "Author 0" },
      datePublished: "2025-11-03",
      reviewBody: "Great service 0",
      inLanguage: "fr_CA",
      reviewRating: { "@type": "Rating", ratingValue: 5, bestRating: 5, worstRating: 1 },
    });
  });
});
