import { describe, expect, it } from "bun:test";
import { organizationGraph, pageMetadata, type SeoConfig } from "@/lib/seo";
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
