// TDD GREEN: R-02 gate behavior tests for AggregateRating suppression.
// These tests encode WHY the behavior matters:
//   - Stub data (fetchedAt null) must NEVER emit AggregateRating (T-02-01: integrity)
//   - Low reviewCount (<5) must NEVER emit AggregateRating (R-02 gate)
//   - Real data (fetchedAt set AND reviewCount >= 5) MUST emit correct AggregateRating
//   - Gate reads from cfg.reviewData.aggregate (authoritative fetched count), not site.reviews
//
// R-02 decision locked in 02-RESEARCH.md: fetchedAt !== null && reviewCount >= 5

import { describe, it, expect } from "bun:test";
import { organizationGraph, type SeoConfig } from "@/lib/seo";
import { site as staticSite, locations as staticLocations } from "@/config";

// Helper: build a cfg with injected reviewData (extended SeoConfig for testing).
// Spread staticSite to satisfy TenantSite's full required-field contract (same
// pattern as seo.test.ts). Override only fields the R-02 tests care about.
function makeCfg(
  reviewData: {
    fetchedAt: string | null;
    aggregate: { ratingValue: number; reviewCount: number };
    reviews: readonly unknown[];
  },
): SeoConfig {
  return {
    site: {
      ...staticSite,
      // Override site.reviews to have a distinct value from reviewData so tests
      // can confirm the gate reads from reviewData.aggregate, not site.reviews.
      reviews: { ratingValue: 4.9, reviewCount: 120, bestRating: 5, source: "google" },
    },
    locations: staticLocations,
    reviewData,
  };
}

function findBusinessNode(graph: ReturnType<typeof organizationGraph>) {
  const node = (graph["@graph"] as Record<string, unknown>[]).find(
    (n) => n["@id"] && String(n["@id"]).endsWith("#business"),
  );
  if (!node) throw new Error("Business node not found in @graph");
  return node;
}

describe("organizationGraph — R-02 AggregateRating gate", () => {
  it("suppresses aggregateRating when fetchedAt is null (stub tenant)", () => {
    const cfg = makeCfg({
      fetchedAt: null,
      aggregate: { ratingValue: 0, reviewCount: 0 },
      reviews: [],
    });
    const graph = organizationGraph("fr", { name: "Test Salon", description: "Desc" }, cfg);
    const biz = findBusinessNode(graph);
    expect("aggregateRating" in biz).toBe(false);
  });

  it("suppresses aggregateRating when fetchedAt is set but reviewCount < 5 (boundary: 4)", () => {
    const cfg = makeCfg({
      fetchedAt: "2026-01-01T00:00:00Z",
      aggregate: { ratingValue: 4.8, reviewCount: 4 },
      reviews: [],
    });
    const graph = organizationGraph("fr", { name: "Test Salon", description: "Desc" }, cfg);
    const biz = findBusinessNode(graph);
    expect("aggregateRating" in biz).toBe(false);
  });

  it("suppresses aggregateRating when reviewCount = 0 (even if fetchedAt set)", () => {
    const cfg = makeCfg({
      fetchedAt: "2026-01-01T00:00:00Z",
      aggregate: { ratingValue: 0, reviewCount: 0 },
      reviews: [],
    });
    const graph = organizationGraph("fr", { name: "Test Salon", description: "Desc" }, cfg);
    const biz = findBusinessNode(graph);
    expect("aggregateRating" in biz).toBe(false);
  });

  it("emits aggregateRating when fetchedAt is set AND reviewCount >= 5 (boundary: exactly 5)", () => {
    const cfg = makeCfg({
      fetchedAt: "2026-01-01T00:00:00Z",
      aggregate: { ratingValue: 4.7, reviewCount: 5 },
      reviews: [],
    });
    const graph = organizationGraph("fr", { name: "Test Salon", description: "Desc" }, cfg);
    const biz = findBusinessNode(graph);
    expect("aggregateRating" in biz).toBe(true);
  });

  it("emits correct ratingValue and reviewCount from reviewData.aggregate (not site.reviews)", () => {
    // site.reviews has ratingValue:4.9, reviewCount:120 — the authoritative values
    // MUST come from reviewData.aggregate (the fetched data), not the static config.
    // This verifies R-02: the gate uses the fetched aggregate as the authority.
    const cfg = makeCfg({
      fetchedAt: "2026-01-01T00:00:00Z",
      aggregate: { ratingValue: 4.7, reviewCount: 87 },
      reviews: [],
    });
    const graph = organizationGraph("fr", { name: "Test Salon", description: "Desc" }, cfg);
    const biz = findBusinessNode(graph);
    const rating = biz["aggregateRating"] as {
      ratingValue: number;
      reviewCount: number;
      bestRating: number;
    };
    expect(rating).toBeDefined();
    expect(rating.ratingValue).toBe(4.7);
    expect(rating.reviewCount).toBe(87);
    // bestRating comes from cfg.site.reviews.bestRating (static config, not fetched)
    expect(rating.bestRating).toBe(5);
  });

  it("suppresses aggregateRating when fetchedAt is null even if site.reviews has values", () => {
    // Regression guard: old code gated on reviewsFetchedAt but READ values from
    // cfg.site.reviews. If someone sets site.reviews.reviewCount > 0 in config
    // but hasn't fetched yet, the gate must still suppress — fetchedAt is the authority.
    const cfg = makeCfg({
      fetchedAt: null,
      aggregate: { ratingValue: 4.9, reviewCount: 120 },
      reviews: [],
    });
    const graph = organizationGraph("fr", { name: "Test Salon", description: "Desc" }, cfg);
    const biz = findBusinessNode(graph);
    expect("aggregateRating" in biz).toBe(false);
  });
});
