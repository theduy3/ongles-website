import { afterEach, describe, expect, it } from "bun:test";
import { organizationGraph, pageMetadata, faqPageGraph, type SeoConfig } from "@/lib/seo";
import { site as staticSite, locations as staticLocations } from "@/config";
import type { TenantSite } from "@/config/types";

// Minimal injected site override — only fields the builders touch.
// WHY: We can't import a full tenant fixture here without pulling in build-time
// env logic, so we build a partial override via spread + cast. Type safety is
// guaranteed by TenantSite; the cast documents intentional incompleteness.
const injectedSite: TenantSite = {
  ...staticSite,
  name: "Injected Salon Name",
  url: "https://injected.example.com",
  // canonicalUrl is the stable @id base (I-01) — distinct from url to verify
  // that @id derives from canonicalUrl, not the runtime-overridable url.
  canonicalUrl: "https://canonical.injected.example.com",
};

const injectedCfg: SeoConfig = {
  site: injectedSite,
  locations: staticLocations,
};

describe("organizationGraph — dependency injection", () => {
  it("uses static site.name when no cfg is passed", () => {
    // WHY: Default param keeps every existing call site working unchanged —
    // the DI contract must not break callers that omit cfg.
    const graph = organizationGraph("fr", {
      name: staticSite.name,
      description: "Test",
    });
    const business = (graph["@graph"] as { name?: string }[])[0];
    expect(business.name).toBe(staticSite.name);
  });

  it("uses injected site.name when cfg is passed", () => {
    // WHY: Core DI contract — when a caller passes an explicit cfg (e.g. from
    // getStoreConfig()), the graph must reflect the injected config, not the
    // stale static module-level default.
    const graph = organizationGraph(
      "fr",
      { name: injectedSite.name, description: "Test" },
      injectedCfg,
    );
    const business = (graph["@graph"] as { name?: string }[])[0];
    expect(business.name).toBe("Injected Salon Name");
  });

  it("derives @id from canonicalUrl (not runtime site.url) and places Organization first", () => {
    // WHY: I-01 — schema.org @id must derive from the stable canonicalUrl, never
    // from the runtime-overridable site.url. This guards against a Supabase
    // site.url override silently destabilising all entity URIs (T-02-04).
    // O-01 — the brand Organization node must be the first @graph member.
    const graph = organizationGraph(
      "fr",
      { name: injectedSite.name, description: "Test" },
      injectedCfg,
    );
    const graphArr = graph["@graph"] as { "@type"?: string; "@id"?: string }[];
    // Organization node is first (O-01).
    expect(graphArr[0]["@type"]).toBe("Organization");
    expect(graphArr[0]["@id"]).toBe(
      "https://canonical.injected.example.com/#organization",
    );
    // Business @id derives from canonicalUrl, NOT from site.url.
    const biz = graphArr.find((n) => n["@id"]?.endsWith("/#business"));
    expect(biz?.["@id"]).toBe(
      "https://canonical.injected.example.com/#business",
    );
  });
});

// ─── GEO freshness: dateModified (build timestamp) ──────────────────────────
// buildTimestamp() reads process.env.BUILD_TIMESTAMP at call time (next.config
// inlines it at build; in tests we set it directly). Fail-safe: omit when unset.

type GraphNode = { "@type"?: string; "@id"?: string; dateModified?: string; review?: unknown[] };
const nodeByType = (g: ReturnType<typeof organizationGraph>, t: string) =>
  (g["@graph"] as GraphNode[]).find((n) => n["@type"] === t);

describe("GEO freshness — dateModified", () => {
  afterEach(() => {
    delete process.env.BUILD_TIMESTAMP;
  });

  it("WebSite node carries dateModified when BUILD_TIMESTAMP is set", () => {
    // WHY: WebSite is a CreativeWork subtype — dateModified is the freshness
    // signal AI crawlers and Google read. Must equal the build timestamp verbatim.
    process.env.BUILD_TIMESTAMP = "2026-06-28T12:00:00.000Z";
    const graph = organizationGraph("fr", { name: "T", description: "D" }, injectedCfg);
    expect(nodeByType(graph, "WebSite")?.dateModified).toBe("2026-06-28T12:00:00.000Z");
  });

  it("omits dateModified entirely when BUILD_TIMESTAMP is unset (no fake date)", () => {
    // WHY: honesty — an unbuilt context must never emit a fabricated freshness date.
    const graph = organizationGraph("fr", { name: "T", description: "D" }, injectedCfg);
    expect("dateModified" in (nodeByType(graph, "WebSite") as object)).toBe(false);
  });

  it("never places dateModified on the LocalBusiness node (schema-invalid there)", () => {
    // WHY: dateModified's domain is CreativeWork; NailSalon is not one. Emitting it
    // would be invalid markup that breaks Rich Results validation.
    process.env.BUILD_TIMESTAMP = "2026-06-28T12:00:00.000Z";
    const graph = organizationGraph("fr", { name: "T", description: "D" }, injectedCfg);
    const biz = (graph["@graph"] as GraphNode[]).find((n) => n["@id"]?.endsWith("/#business"));
    expect("dateModified" in (biz as object)).toBe(false);
  });

  it("faqPageGraph carries dateModified when built, omits it otherwise", () => {
    const items = [{ q: "Open hours?", a: "Tue–Sat." }];
    process.env.BUILD_TIMESTAMP = "2026-06-28T12:00:00.000Z";
    const built = faqPageGraph(items) as unknown as { dateModified?: string };
    expect(built.dateModified).toBe("2026-06-28T12:00:00.000Z");
    delete process.env.BUILD_TIMESTAMP;
    const unbuilt = faqPageGraph(items) as unknown as object;
    expect("dateModified" in unbuilt).toBe(false);
  });
});

// ─── GEO authority: individual Review nodes (honesty-gated) ──────────────────

describe("GEO authority — individual Review nodes", () => {
  const realReview = {
    id: "g1",
    author: "Marie L.",
    rating: 5,
    dateISO: "2026-05-01",
    lang: "fr" as const,
    text: "Service impeccable, ongles magnifiques.",
  };

  it("emits Review nodes from genuinely fetched review bodies", () => {
    // WHY: real fetched reviews with datePublished are highly citable by AI search.
    const cfg: SeoConfig = {
      ...injectedCfg,
      reviewData: {
        fetchedAt: "2026-06-23T00:00:00Z",
        aggregate: { ratingValue: 5, reviewCount: 12 },
        reviews: [realReview],
      },
    };
    const graph = organizationGraph("fr", { name: "T", description: "D" }, cfg);
    const biz = (graph["@graph"] as GraphNode[]).find((n) => n["@id"]?.endsWith("/#business"));
    const review = (biz?.review as Array<Record<string, unknown>>)[0];
    expect(biz?.review).toHaveLength(1);
    expect(review["@type"]).toBe("Review");
    expect(review["datePublished"]).toBe("2026-05-01");
    expect((review["author"] as { name?: string }).name).toBe("Marie L.");
    expect((review["reviewRating"] as { ratingValue?: number }).ratingValue).toBe(5);
  });

  it("emits NO Review nodes when fetched data has empty reviews[] (aggregate-only)", () => {
    // WHY: live tenants store aggregates with reviews:[] — must stay honest, no nodes.
    const cfg: SeoConfig = {
      ...injectedCfg,
      reviewData: {
        fetchedAt: "2026-06-23T00:00:00Z",
        aggregate: { ratingValue: 3.9, reviewCount: 300 },
        reviews: [],
      },
    };
    const graph = organizationGraph("fr", { name: "T", description: "D" }, cfg);
    const biz = (graph["@graph"] as GraphNode[]).find((n) => n["@id"]?.endsWith("/#business"));
    expect("review" in (biz as object)).toBe(false);
  });

  it("emits NO Review nodes when reviews were never fetched (fetchedAt null)", () => {
    const cfg: SeoConfig = {
      ...injectedCfg,
      reviewData: {
        fetchedAt: null,
        aggregate: { ratingValue: 0, reviewCount: 0 },
        reviews: [realReview],
      },
    };
    const graph = organizationGraph("fr", { name: "T", description: "D" }, cfg);
    const biz = (graph["@graph"] as GraphNode[]).find((n) => n["@id"]?.endsWith("/#business"));
    expect("review" in (biz as object)).toBe(false);
  });
});

describe("pageMetadata — dependency injection", () => {
  it("uses static site.name when no cfg is passed", () => {
    // WHY: Backward-compat — existing callers pass no cfg and must keep working.
    const meta = pageMetadata("fr", "/test", {
      title: "T",
      description: "D",
    });
    expect((meta.openGraph as { siteName?: string })?.siteName).toBe(
      staticSite.name,
    );
  });

  it("uses injected site.name in openGraph.siteName", () => {
    // WHY: openGraph.siteName is the social-share brand name; it must reflect
    // the runtime config override so tenant-specific OG data is correct.
    const meta = pageMetadata(
      "fr",
      "/test",
      { title: "T", description: "D" },
      injectedCfg,
    );
    expect((meta.openGraph as { siteName?: string })?.siteName).toBe(
      "Injected Salon Name",
    );
  });
});

// ─── Phase 4: pricingGraph — ItemList wrapper (RED until 04-02 implements) ───
// These tests import pricingGraph which doesn't exist yet in src/lib/seo.ts.
// They MUST fail until Task 2 (GREEN) adds the export.

import { pricingGraph } from "@/lib/seo";

describe("Phase 4: pricingGraph — ItemList with AggregateOffer/Offer per item", () => {
  // Minimal ServiceItem fixtures — shapes already defined in seo.ts (ServiceItem type).
  type ServiceItem = {
    name: string;
    description: string;
    price: number;
    priceTo?: number;
    path?: string;
  };

  const items: readonly ServiceItem[] = [
    // priceTo > price → AggregateOffer
    { name: "Pose d'ongles", description: "Full set", price: 60, priceTo: 80 },
    // priceTo === price → Offer (not a range)
    { name: "Manucure", description: "Basic mani", price: 30, priceTo: 30 },
    // no priceTo → Offer
    { name: "Remplissage", description: "Fill", price: 45 },
  ];

  it("pricingGraph @type is ItemList", () => {
    const graph = pricingGraph("fr", items, injectedCfg);
    expect(graph["@type"]).toBe("ItemList");
  });

  it("pricingGraph @context is https://schema.org", () => {
    const graph = pricingGraph("fr", items, injectedCfg);
    expect(graph["@context"]).toBe("https://schema.org");
  });

  it("pricingGraph itemListElement has same length as items", () => {
    const graph = pricingGraph("fr", items, injectedCfg);
    const elements = (graph as unknown as { itemListElement: unknown[] }).itemListElement;
    expect(elements).toHaveLength(items.length);
  });

  it("emits AggregateOffer with lowPrice/highPrice when priceTo > price", () => {
    const graph = pricingGraph("fr", items, injectedCfg);
    const elements = (graph as unknown as { itemListElement: Array<Record<string, unknown>> }).itemListElement;
    const firstItem = elements[0] as Record<string, unknown>;
    const offers = firstItem["offers"] as Record<string, unknown>;
    expect(offers["@type"]).toBe("AggregateOffer");
    expect(offers["lowPrice"]).toBe(60);
    expect(offers["highPrice"]).toBe(80);
  });

  it("emits Offer (not AggregateOffer) when priceTo === price", () => {
    const graph = pricingGraph("fr", items, injectedCfg);
    const elements = (graph as unknown as { itemListElement: Array<Record<string, unknown>> }).itemListElement;
    const secondItem = elements[1] as Record<string, unknown>;
    const offers = secondItem["offers"] as Record<string, unknown>;
    expect(offers["@type"]).toBe("Offer");
  });

  it("emits Offer (not AggregateOffer) when priceTo is absent", () => {
    const graph = pricingGraph("fr", items, injectedCfg);
    const elements = (graph as unknown as { itemListElement: Array<Record<string, unknown>> }).itemListElement;
    const thirdItem = elements[2] as Record<string, unknown>;
    const offers = thirdItem["offers"] as Record<string, unknown>;
    expect(offers["@type"]).toBe("Offer");
  });
});
