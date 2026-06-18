/**
 * schema-invariants.test.ts — bun:test for schema-invariants module.
 *
 * Tests are written RED-first (before the implementation exists).
 * Iterates TENANT_REGISTRY excluding "template"; calls builders with
 * explicit per-tenant SeoConfig (pitfall 2: no module singleton).
 *
 * Invariant groups tested:
 *   - @context on every graph root
 *   - @id format matching canonicalUrl host
 *   - No cross-tenant business @id collision (I-02)
 *   - sameAs absent or non-empty, never [] (I-03)
 *   - faqPageGraph item count preserved (sample)
 *   - R-02: AggregateRating suppressed when fetchedAt null or reviewCount < 5
 *   - R-02 positive path: AggregateRating present when fetchedAt set + reviewCount >= 5
 *   - Required NailSalon fields present
 *   - Distinct Organization node present in organizationGraph (O-01)
 *   - offer() emits AggregateOffer when priceTo > price, else Offer
 */

import { describe, it, expect } from "bun:test";
import { validateSchemaInvariants, assertSchemaInvariants } from "./schema-invariants";

// ─── Main invariant runner ────────────────────────────────────────────────────

describe("validateSchemaInvariants", () => {
  it("returns [] for all current non-template tenants", () => {
    expect(validateSchemaInvariants()).toEqual([]);
  });
});

describe("assertSchemaInvariants", () => {
  it("does not throw for current valid tenant configs", () => {
    expect(() => assertSchemaInvariants()).not.toThrow();
  });
});

// ─── Per-tenant invariant detail tests ───────────────────────────────────────

import { TENANT_REGISTRY } from "./index";
import type { SeoConfig } from "@/lib/seo";
import {
  organizationGraph,
  servicesGraph,
  serviceGraph,
  faqPageGraph,
} from "@/lib/seo";

// offer() is not exported from seo.ts — tested indirectly via serviceGraph.

const EXCLUDED = new Set(["template"]);

function tenantSeoConfig(id: string): SeoConfig {
  const cfg = TENANT_REGISTRY[id as keyof typeof TENANT_REGISTRY];
  return {
    site: cfg.site,
    locations: [cfg.location],
    reviewData: cfg.reviewData,
  };
}

// ─── @context invariant ───────────────────────────────────────────────────────

describe("@context invariant — every graph root is https://schema.org", () => {
  for (const id of Object.keys(TENANT_REGISTRY)) {
    if (EXCLUDED.has(id)) continue;
    it(`tenant ${id}: organizationGraph @context`, () => {
      const cfg = tenantSeoConfig(id);
      const graph = organizationGraph("fr", { name: cfg.site.name, description: "test" }, cfg);
      expect(graph["@context"]).toBe("https://schema.org");
    });

    it(`tenant ${id}: servicesGraph @context`, () => {
      const cfg = tenantSeoConfig(id);
      const graph = servicesGraph("fr", [{ name: "Test", description: "d", price: 10, priceTo: 20 }], cfg);
      expect(graph["@context"]).toBe("https://schema.org");
    });
  }
});

// ─── @id format invariant ─────────────────────────────────────────────────────

describe("@id format — matches canonicalUrl host", () => {
  for (const id of Object.keys(TENANT_REGISTRY)) {
    if (EXCLUDED.has(id)) continue;
    it(`tenant ${id}: business @id uses canonicalUrl`, () => {
      const cfg = tenantSeoConfig(id);
      const graph = organizationGraph("fr", { name: cfg.site.name, description: "test" }, cfg);
      const nodes = graph["@graph"] as unknown as Array<Record<string, unknown>>;
      const business = nodes.find((n) => typeof n["@id"] === "string" && String(n["@id"]).endsWith("#business"));
      expect(business).toBeDefined();
      expect(business!["@id"]).toBe(`${cfg.site.canonicalUrl}/#business`);
    });

    it(`tenant ${id}: location @id uses canonicalUrl`, () => {
      const cfg = tenantSeoConfig(id);
      const graph = organizationGraph("fr", { name: cfg.site.name, description: "test" }, cfg);
      const nodes = graph["@graph"] as unknown as Array<Record<string, unknown>>;
      const locationNode = nodes.find((n) => typeof n["@id"] === "string" && String(n["@id"]).includes("#location-"));
      expect(locationNode).toBeDefined();
      expect(String(locationNode!["@id"])).toMatch(new RegExp(`^${cfg.site.canonicalUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/#location-`));
    });
  }
});

// ─── I-02 cross-tenant @id uniqueness ────────────────────────────────────────

describe("I-02: no cross-tenant business @id collision", () => {
  it("all non-template tenants have distinct business @id values", () => {
    const ids = new Set<string>();
    for (const [tid, cfg] of Object.entries(TENANT_REGISTRY)) {
      if (EXCLUDED.has(tid)) continue;
      const bid = `${cfg.site.canonicalUrl}/#business`;
      expect(ids.has(bid)).toBe(false);
      ids.add(bid);
    }
    expect(ids.size).toBeGreaterThan(0);
  });
});

// ─── I-03 sameAs never empty array ───────────────────────────────────────────

describe("I-03: sameAs absent or non-empty, never []", () => {
  for (const id of Object.keys(TENANT_REGISTRY)) {
    if (EXCLUDED.has(id)) continue;
    it(`tenant ${id}: sameAs absent or non-empty on business node`, () => {
      const cfg = tenantSeoConfig(id);
      const graph = organizationGraph("fr", { name: cfg.site.name, description: "test" }, cfg);
      const nodes = graph["@graph"] as unknown as Array<Record<string, unknown>>;
      const business = nodes.find((n) => typeof n["@id"] === "string" && String(n["@id"]).endsWith("#business"));
      expect(business).toBeDefined();
      const sameAs = business!["sameAs"];
      if (sameAs !== undefined) {
        expect(Array.isArray(sameAs)).toBe(true);
        expect((sameAs as unknown[]).length).toBeGreaterThan(0);
      }
      // undefined is fine (socialProfiles empty → omitted)
    });
  }
});

// ─── FAQ item count preserved ─────────────────────────────────────────────────

describe("faqPageGraph — item count preserved", () => {
  it("does not drop items for a sample input", () => {
    const items = [
      { q: "Question 1?", a: "Answer 1." },
      { q: "Question 2?", a: "Answer 2." },
      { q: "Question 3?", a: "Answer 3." },
    ];
    const graph = faqPageGraph(items);
    const entities = graph["mainEntity"] as unknown as unknown[];
    expect(entities.length).toBe(items.length);
  });
});

// ─── R-02 AggregateRating gate ───────────────────────────────────────────────

describe("R-02: AggregateRating suppression", () => {
  const cfg = tenantSeoConfig("ongles-maily");

  it("suppresses AggregateRating when fetchedAt is null", () => {
    const testCfg: SeoConfig = {
      ...cfg,
      reviewData: { fetchedAt: null, aggregate: { ratingValue: 4.8, reviewCount: 10 }, reviews: [] },
    };
    const graph = organizationGraph("fr", { name: "Test", description: "d" }, testCfg);
    const nodes = graph["@graph"] as unknown as Array<Record<string, unknown>>;
    const business = nodes.find((n) => String(n["@id"]).endsWith("#business"))!;
    expect(business["aggregateRating"]).toBeUndefined();
  });

  it("suppresses AggregateRating when reviewCount < 5", () => {
    const testCfg: SeoConfig = {
      ...cfg,
      reviewData: { fetchedAt: "2026-01-01T00:00:00Z", aggregate: { ratingValue: 4.8, reviewCount: 4 }, reviews: [] },
    };
    const graph = organizationGraph("fr", { name: "Test", description: "d" }, testCfg);
    const nodes = graph["@graph"] as unknown as Array<Record<string, unknown>>;
    const business = nodes.find((n) => String(n["@id"]).endsWith("#business"))!;
    expect(business["aggregateRating"]).toBeUndefined();
  });

  it("suppresses AggregateRating when reviewCount === 0 and fetchedAt null (stub config)", () => {
    const testCfg: SeoConfig = {
      ...cfg,
      reviewData: { fetchedAt: null, aggregate: { ratingValue: 0, reviewCount: 0 }, reviews: [] },
    };
    const graph = organizationGraph("fr", { name: "Test", description: "d" }, testCfg);
    const nodes = graph["@graph"] as unknown as Array<Record<string, unknown>>;
    const business = nodes.find((n) => String(n["@id"]).endsWith("#business"))!;
    expect(business["aggregateRating"]).toBeUndefined();
  });

  it("emits AggregateRating when fetchedAt set AND reviewCount >= 5 (positive path)", () => {
    const syntheticCfg: SeoConfig = {
      site: cfg.site,
      locations: cfg.locations,
      reviewData: {
        fetchedAt: "2026-06-01T00:00:00Z",
        aggregate: { ratingValue: 4.9, reviewCount: 5 },
        reviews: [],
      },
    };
    const graph = organizationGraph("fr", { name: "Test", description: "d" }, syntheticCfg);
    const nodes = graph["@graph"] as unknown as Array<Record<string, unknown>>;
    const business = nodes.find((n) => String(n["@id"]).endsWith("#business"))!;
    expect(business["aggregateRating"]).toBeDefined();
    const rating = business["aggregateRating"] as Record<string, unknown>;
    expect(rating["@type"]).toBe("AggregateRating");
    expect(rating["ratingValue"]).toBe(4.9);
    expect(rating["reviewCount"]).toBe(5);
  });
});

// ─── Required NailSalon fields ────────────────────────────────────────────────

describe("Required NailSalon fields on business node", () => {
  for (const id of Object.keys(TENANT_REGISTRY)) {
    if (EXCLUDED.has(id)) continue;
    it(`tenant ${id}: has name, url, telephone, address, geo, openingHoursSpecification`, () => {
      const cfg = tenantSeoConfig(id);
      const graph = organizationGraph("fr", { name: cfg.site.name, description: "test" }, cfg);
      const nodes = graph["@graph"] as unknown as Array<Record<string, unknown>>;
      const business = nodes.find((n) => String(n["@id"]).endsWith("#business"))!;
      expect(business).toBeDefined();
      expect(typeof business["name"]).toBe("string");
      expect(business["name"]).not.toBe("");
      expect(typeof business["url"]).toBe("string");
      expect(typeof business["telephone"]).toBe("string");
      expect(business["address"]).toBeDefined();
      expect(business["geo"]).toBeDefined();
      expect(business["openingHoursSpecification"]).toBeDefined();
    });
  }
});

// ─── O-01 Organization node present ──────────────────────────────────────────

describe("O-01: distinct Organization node present in organizationGraph", () => {
  for (const id of Object.keys(TENANT_REGISTRY)) {
    if (EXCLUDED.has(id)) continue;
    it(`tenant ${id}: has Organization node with #organization @id`, () => {
      const cfg = tenantSeoConfig(id);
      const graph = organizationGraph("fr", { name: cfg.site.name, description: "test" }, cfg);
      const nodes = graph["@graph"] as unknown as Array<Record<string, unknown>>;
      const orgNode = nodes.find(
        (n) => n["@type"] === "Organization" && String(n["@id"]).endsWith("#organization"),
      );
      expect(orgNode).toBeDefined();
      expect(orgNode!["@id"]).toBe(`${cfg.site.canonicalUrl}/#organization`);
    });
  }
});

// ─── offer() AggregateOffer vs Offer ─────────────────────────────────────────

describe("offer() — AggregateOffer when priceTo > price, else Offer (SCHEMA-02)", () => {
  it("emits AggregateOffer for a service with priceTo > price", () => {
    const cfg = tenantSeoConfig("ongles-maily");
    const graph = serviceGraph("fr", { name: "Pose ongles", description: "d", price: 40, priceTo: 60 }, cfg);
    const offersNode = graph["offers"] as Record<string, unknown>;
    expect(offersNode["@type"]).toBe("AggregateOffer");
    expect(offersNode["lowPrice"]).toBe(40);
    expect(offersNode["highPrice"]).toBe(60);
  });

  it("emits Offer for a service with no priceTo", () => {
    const cfg = tenantSeoConfig("ongles-maily");
    const graph = serviceGraph("fr", { name: "Pose ongles", description: "d", price: 40 }, cfg);
    const offersNode = graph["offers"] as Record<string, unknown>;
    expect(offersNode["@type"]).toBe("Offer");
    expect(offersNode["price"]).toBe(40);
  });

  it("emits Offer when priceTo === price (not a range)", () => {
    const cfg = tenantSeoConfig("ongles-maily");
    const graph = serviceGraph("fr", { name: "Pose ongles", description: "d", price: 40, priceTo: 40 }, cfg);
    const offersNode = graph["offers"] as Record<string, unknown>;
    expect(offersNode["@type"]).toBe("Offer");
  });
});
