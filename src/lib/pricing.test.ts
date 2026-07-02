import { describe, expect, it } from "bun:test";
import { buildPricingItems } from "@/lib/pricing";
import type { Service, ServiceId } from "@/config/types";

// Two service fixtures — one single-price, one with a priceTo range — so the
// suite covers both Offer shapes. ids are arbitrary strings cast to ServiceId;
// the presenter only uses them to index the injected title/description maps.
const svcA = {
  id: "svc-a",
  slug: { fr: "manucure-fr", en: "manicure-en" },
  price: 50,
  photo: false,
} as unknown as Service;

const svcB = {
  id: "svc-b",
  slug: { fr: "pose-fr", en: "set-en" },
  price: 60,
  priceTo: 90,
  photo: false,
} as unknown as Service;

const services: readonly Service[] = [svcA, svcB];

const titles = {
  "svc-a": { title: "Manucure" },
  "svc-b": { title: "Pose d'ongles" },
} as unknown as Record<ServiceId, { title: string }>;

const seoServices = {
  "svc-a": { schemaDescription: "A clean classic manicure." },
  "svc-b": { schemaDescription: "A full acrylic set." },
} as unknown as Record<ServiceId, { schemaDescription: string }>;

describe("buildPricingItems", () => {
  // The reason this presenter exists: the table (rows) and the JSON-LD
  // (graphItems) must never disagree about a service's name or price. This is
  // the invariant the two-inlined-transforms shape could silently break.
  it("keeps rows and graphItems in agreement on name and price per service", () => {
    const { rows, graphItems } = buildPricingItems("fr", services, titles, seoServices);
    expect(rows).toHaveLength(graphItems.length);
    rows.forEach((row, i) => {
      expect(row.name).toBe(graphItems[i].name);
      expect(row.price).toBe(graphItems[i].price);
      expect(row.priceTo).toBe(graphItems[i].priceTo);
    });
  });

  // Tail difference: rows carry a locale-PREFIXED href for <Link>; graphItems
  // carry an UNPREFIXED path (seo.ts prefixes it itself when building the URL).
  it("prefixes the row href with the locale but leaves the graph path bare", () => {
    const { rows, graphItems } = buildPricingItems("fr", services, titles, seoServices);
    expect(rows[0].href).toBe("/fr/services/manucure-fr");
    expect(graphItems[0].path).toBe("/services/manucure-fr");
  });

  it("renders the href in the requested locale", () => {
    const { rows } = buildPricingItems("en", services, titles, seoServices);
    expect(rows[0].href).toBe("/en/services/manicure-en");
  });

  // Only graphItems carry the SEO schema description; it must come from the
  // injected seoServices map, not the title map.
  it("sources the graph description from seoServices", () => {
    const { graphItems } = buildPricingItems("fr", services, titles, seoServices);
    expect(graphItems[0].description).toBe("A clean classic manicure.");
    expect(graphItems[1].description).toBe("A full acrylic set.");
  });

  it("preserves the id and order of the input services in rows", () => {
    const { rows } = buildPricingItems("fr", services, titles, seoServices);
    expect(rows.map((r) => r.id)).toEqual(["svc-a", "svc-b"]);
  });

  // Fail-loud (Q3): a missing title is a locale-parity defect, not a display
  // edge case. The presenter must throw, never fabricate a name from the id.
  it("throws when a service title is missing", () => {
    const partialTitles = {
      "svc-a": { title: "Manucure" },
    } as unknown as Record<ServiceId, { title: string }>;
    expect(() =>
      buildPricingItems("fr", services, partialTitles, seoServices),
    ).toThrow();
  });
});
