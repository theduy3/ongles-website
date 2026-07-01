// R-02 gate WIRING test: proves reviewSchemaFragment is spread into the business
// node of organizationGraph. The full boundary matrix lives in
// src/config/review-honesty.test.ts and src/lib/review-schema-fragment.test.ts.
// This file only proves the wiring: emit when the gate passes, suppress when not.

import { describe, it, expect } from "bun:test";
import { organizationGraph, type OrgGraphConfig } from "@/lib/seo";
import { site as staticSite, locations as staticLocations } from "@/config";
import type { ReviewData } from "@/config/types";

function makeCfg(reviewData: ReviewData): OrgGraphConfig {
  return {
    site: {
      ...staticSite,
      // Distinct from reviewData so a regression that reads site.reviews is caught.
      reviews: { ratingValue: 4.9, reviewCount: 120, bestRating: 5, source: "google" },
    },
    locations: staticLocations,
    reviewData,
  };
}

function findBusinessNode(graph: ReturnType<typeof organizationGraph>) {
  const node = (graph["@graph"] as unknown as Record<string, unknown>[]).find(
    (n) => n["@id"] && String(n["@id"]).endsWith("#business"),
  );
  if (!node) throw new Error("Business node not found in @graph");
  return node;
}

describe("organizationGraph — R-02 wiring", () => {
  it("suppresses aggregateRating for a stub tenant (fetchedAt null)", () => {
    const cfg = makeCfg({ fetchedAt: null, aggregate: { ratingValue: 4.9, reviewCount: 120 }, reviews: [] });
    const biz = findBusinessNode(organizationGraph("fr", { name: "Test", description: "D" }, cfg));
    expect("aggregateRating" in biz).toBe(false);
  });

  it("emits aggregateRating from reviewData.aggregate when the gate passes (count = 5)", () => {
    const cfg = makeCfg({ fetchedAt: "2026-01-01T00:00:00Z", aggregate: { ratingValue: 4.7, reviewCount: 5 }, reviews: [] });
    const biz = findBusinessNode(organizationGraph("fr", { name: "Test", description: "D" }, cfg));
    const rating = biz["aggregateRating"] as { ratingValue: number; reviewCount: number };
    expect(rating).toBeDefined();
    expect(rating.ratingValue).toBe(4.7);
    expect(rating.reviewCount).toBe(5);
  });
});
