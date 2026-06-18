// TDD RED: R-02 gate behavior tests for AggregateRating suppression.
// These tests encode WHY the behavior matters:
//   - Stub data (fetchedAt null) must NEVER emit AggregateRating (T-02-01: integrity)
//   - Low reviewCount (<5) must NEVER emit AggregateRating (R-02 gate)
//   - Real data (fetchedAt set AND reviewCount >= 5) MUST emit correct AggregateRating
//   - Gate reads from tenant.reviewData.aggregate (authoritative fetched count), not site.reviews
//
// R-02 decision locked in 02-RESEARCH.md: fetchedAt !== null && reviewCount >= 5

import { describe, it, expect } from "bun:test";
import { organizationGraph } from "@/lib/seo";
import type { SeoConfig } from "@/lib/seo";
import type { TenantSite, Location } from "@/config/types";

// Build a minimal SeoConfig with the given reviewData shape injected via the
// reviewData field. organizationGraph reads reviewData via tenant singleton, but
// for isolated testing we need a way to pass reviewData — see implementation note
// below. The plan requires organizationGraph to accept an extended cfg that carries
// reviewData, OR for reviews.ts to expose a testable pure function.
//
// Plan action: "Rewrite src/lib/reviews.ts to read from tenant.reviewData".
// The organizationGraph builder then reads from the module-level exports of reviews.ts,
// which come from the singleton tenant. For testing isolation we use module-level
// overrides via bun's module mocking, or we extend the SeoConfig injection surface.
//
// Decision: extend SeoConfig to carry optional reviewData for testing; the implementation
// checks cfg.reviewData if present (dependency injection path), falling back to the
// module-level singleton. This keeps tests isolated without process.env manipulation.

// Minimal site stub for test SeoConfig
const stubSite: TenantSite = {
  name: "Test Salon",
  url: "https://test.example.com",
  tagline: "Test tagline",
  description: "Test description",
  contact: {
    phoneHref: "tel:+15551234567",
    email: "test@test.com",
    address: {
      street: "123 Main St",
      city: "Quebec City",
      region: "QC",
      postalCode: "G1R 1A1",
      country: "CA",
    },
  },
  geo: { lat: 46.8, lng: -71.2 },
  hours: [],
  priceRange: "$$",
  reviews: {
    ratingValue: 4.9,
    reviewCount: 120,
    bestRating: 5,
  },
  socialProfiles: [],
  bookingUrl: "https://booking.test.example.com",
  logo: "/images/logo.svg",
};

const stubLocation: Location = {
  id: "test-loc",
  name: "Test Location",
  phoneHref: "tel:+15551234567",
  address: {
    street: "123 Main St",
    city: "Quebec City",
    region: "QC",
    postalCode: "G1R 1A1",
    country: "CA",
  },
  geo: { lat: 46.8, lng: -71.2 },
  hoursSpec: [],
  mapCid: "",
};

function findBusinessNode(graph: ReturnType<typeof organizationGraph>) {
  const node = graph["@graph"].find(
    (n) =>
      n["@id"] &&
      String(n["@id"]).endsWith("#business"),
  );
  if (!node) throw new Error("Business node not found in @graph");
  return node;
}

// Helper: build a cfg with injected reviewData (extended SeoConfig for testing)
function makeCfg(
  reviewData: { fetchedAt: string | null; aggregate: { ratingValue: number; reviewCount: number }; reviews: readonly unknown[] },
): SeoConfig & { reviewData: typeof reviewData } {
  return { site: stubSite, locations: [stubLocation], reviewData };
}

describe("organizationGraph — R-02 AggregateRating gate", () => {
  it("suppresses aggregateRating when fetchedAt is null (stub tenant)", () => {
    const cfg = makeCfg({ fetchedAt: null, aggregate: { ratingValue: 0, reviewCount: 0 }, reviews: [] });
    const graph = organizationGraph("fr", { name: "Test Salon", description: "Desc" }, cfg);
    const biz = findBusinessNode(graph);
    expect("aggregateRating" in biz).toBe(false);
  });

  it("suppresses aggregateRating when fetchedAt is set but reviewCount < 5 (boundary: 4)", () => {
    const cfg = makeCfg({ fetchedAt: "2026-01-01T00:00:00Z", aggregate: { ratingValue: 4.8, reviewCount: 4 }, reviews: [] });
    const graph = organizationGraph("fr", { name: "Test Salon", description: "Desc" }, cfg);
    const biz = findBusinessNode(graph);
    expect("aggregateRating" in biz).toBe(false);
  });

  it("suppresses aggregateRating when reviewCount = 0 (even if fetchedAt set)", () => {
    const cfg = makeCfg({ fetchedAt: "2026-01-01T00:00:00Z", aggregate: { ratingValue: 0, reviewCount: 0 }, reviews: [] });
    const graph = organizationGraph("fr", { name: "Test Salon", description: "Desc" }, cfg);
    const biz = findBusinessNode(graph);
    expect("aggregateRating" in biz).toBe(false);
  });

  it("emits aggregateRating when fetchedAt is set AND reviewCount >= 5 (boundary: exactly 5)", () => {
    const cfg = makeCfg({ fetchedAt: "2026-01-01T00:00:00Z", aggregate: { ratingValue: 4.7, reviewCount: 5 }, reviews: [] });
    const graph = organizationGraph("fr", { name: "Test Salon", description: "Desc" }, cfg);
    const biz = findBusinessNode(graph);
    expect("aggregateRating" in biz).toBe(true);
  });

  it("emits correct ratingValue and reviewCount from reviewData.aggregate (not site.reviews)", () => {
    // site.reviews has ratingValue:4.9, reviewCount:120 — the authoritative values
    // must come from reviewData.aggregate (the fetched data), not the static config.
    const cfg = makeCfg({ fetchedAt: "2026-01-01T00:00:00Z", aggregate: { ratingValue: 4.7, reviewCount: 87 }, reviews: [] });
    const graph = organizationGraph("fr", { name: "Test Salon", description: "Desc" }, cfg);
    const biz = findBusinessNode(graph);
    expect(biz.aggregateRating).toBeDefined();
    expect((biz.aggregateRating as { ratingValue: number }).ratingValue).toBe(4.7);
    expect((biz.aggregateRating as { reviewCount: number }).reviewCount).toBe(87);
    // bestRating comes from cfg.site.reviews.bestRating (static config, not fetched)
    expect((biz.aggregateRating as { bestRating: number }).bestRating).toBe(5);
  });

  it("suppresses aggregateRating when fetchedAt is null even if site.reviews has values", () => {
    // Regression guard: the old code gated on reviewsFetchedAt but READ values from
    // cfg.site.reviews. If someone sets site.reviews.reviewCount > 0 in config but
    // hasn't fetched yet, the gate must still suppress (fetchedAt is the authority).
    const cfg = makeCfg({ fetchedAt: null, aggregate: { ratingValue: 4.9, reviewCount: 120 }, reviews: [] });
    const graph = organizationGraph("fr", { name: "Test Salon", description: "Desc" }, cfg);
    const biz = findBusinessNode(graph);
    expect("aggregateRating" in biz).toBe(false);
  });
});
