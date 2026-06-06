import { describe, it, expect } from "bun:test";
import {
  buildSparseDoc,
  extractSeo,
  emptySeoDraft,
  type SettingsDraftState,
} from "./settings-draft";

const empty: SettingsDraftState = {
  site: {},
  services: [],
  seoFr: emptySeoDraft(),
  seoEn: emptySeoDraft(),
  customCode: [],
};

describe("buildSparseDoc", () => {
  it("returns empty doc when nothing is set", () => {
    expect(buildSparseDoc(empty)).toEqual({});
  });

  it("includes site.name when provided", () => {
    const doc = buildSparseDoc({ ...empty, site: { name: "Salon X" } });
    expect(doc.site?.name).toBe("Salon X");
  });

  it("omits site.name when empty string", () => {
    const doc = buildSparseDoc({ ...empty, site: { name: "" } });
    expect(doc.site).toBeUndefined();
  });

  it("includes valid hours entries only", () => {
    const doc = buildSparseDoc({
      ...empty,
      site: {
        hours: [
          { days: ["Monday"], opens: "09:00", closes: "17:00" },
          { days: [], opens: "", closes: "" }, // invalid — omitted
        ],
      },
    });
    expect(doc.site?.hours).toHaveLength(1);
    expect(doc.site?.hours?.[0].days).toEqual(["Monday"]);
  });

  it("omits hours when all entries are invalid", () => {
    const doc = buildSparseDoc({
      ...empty,
      site: { hours: [{ days: [], opens: "", closes: "" }] },
    });
    expect(doc.site?.hours).toBeUndefined();
  });

  it("includes only services with at least one value override", () => {
    const doc = buildSparseDoc({
      ...empty,
      services: [
        { id: "pose-ongles", price: 60 },
        { id: "remplissage" }, // no value fields — omitted
      ],
    });
    expect(doc.services).toHaveLength(1);
    expect(doc.services?.[0].id).toBe("pose-ongles");
    expect(doc.services?.[0].price).toBe(60);
  });

  it("wraps seo meta under { meta: ... }", () => {
    const doc = buildSparseDoc({
      ...empty,
      seoEn: { ...emptySeoDraft(), meta: { homeTitle: "My Title" } },
    });
    expect(doc.seo?.en).toEqual({ meta: { homeTitle: "My Title" } });
  });

  it("omits seo when all meta values are empty", () => {
    const doc = buildSparseDoc({
      ...empty,
      seoEn: { ...emptySeoDraft(), meta: { homeTitle: "" } },
    });
    expect(doc.seo).toBeUndefined();
  });

  it("includes booker only when at least one field is set", () => {
    const doc = buildSparseDoc({
      ...empty,
      site: { booker: { brand: "Square", giftCertificate: undefined } },
    });
    expect(doc.site?.booker?.brand).toBe("Square");
    expect(doc.site?.booker?.giftCertificate).toBeUndefined();
  });

  it("includes contact.address when address fields are set", () => {
    const doc = buildSparseDoc({
      ...empty,
      site: { contact: { address: { city: "Québec", country: "CA" } } },
    });
    expect(doc.site?.contact?.address?.city).toBe("Québec");
  });

  it("omits geo when both lat and lng are absent", () => {
    const doc = buildSparseDoc({
      ...empty,
      site: { geo: {} },
    });
    expect(doc.site?.geo).toBeUndefined();
  });

  it("includes geo when lat is provided", () => {
    const doc = buildSparseDoc({
      ...empty,
      site: { geo: { lat: 46.87 } },
    });
    expect(doc.site?.geo?.lat).toBe(46.87);
  });
});

// ── Task 3: nested SeoDraft model ─────────────────────────────────────────────

function baseDraft(): SettingsDraftState {
  return { site: {}, services: [], seoFr: emptySeoDraft(), seoEn: emptySeoDraft(), customCode: [] };
}

describe("extractSeo", () => {
  it("reads nested meta/services/gallery/org, keeping only strings", () => {
    const d = extractSeo({
      meta: { homeTitle: "H" },
      services: { "pose-ongles": { metaTitle: "T", bogus: 5 } },
      gallery: { "nail-art-1": { alt: "A" } },
      org: { description: "O" },
    });
    expect(d.meta).toEqual({ homeTitle: "H" });
    expect(d.services).toEqual({ "pose-ongles": { metaTitle: "T" } });
    expect(d.gallery).toEqual({ "nail-art-1": { alt: "A" } });
    expect(d.org).toEqual({ description: "O" });
  });

  it("returns an empty draft for undefined", () => {
    expect(extractSeo(undefined)).toEqual(emptySeoDraft());
  });
});

describe("buildSparseDoc — seo", () => {
  it("omits seo entirely when every field is blank", () => {
    const doc = buildSparseDoc(baseDraft());
    expect(doc.seo).toBeUndefined();
  });

  it("recursively omits empty service/gallery/meta entries", () => {
    const d = baseDraft();
    d.seoFr = {
      meta: { homeTitle: "H", servicesTitle: "" },
      services: { "pose-ongles": { metaTitle: "T", metaDescription: "" }, remplissage: {} },
      gallery: { "nail-art-1": { alt: "A" }, "nail-art-2": { alt: "" } },
      org: { description: "" },
    };
    const doc = buildSparseDoc(d);
    expect(doc.seo?.fr).toEqual({
      meta: { homeTitle: "H" },
      services: { "pose-ongles": { metaTitle: "T" } },
      gallery: { "nail-art-1": { alt: "A" } },
    });
    expect(doc.seo?.en).toBeUndefined();
  });
});

// ── Task 1: widgetHost sparse persistence ─────────────────────────────────────

import { test } from "bun:test";

test("buildSparseDoc persists widgetHost when set, omits when empty", () => {
  const base = { site: {}, services: [], seoFr: emptySeoDraft(), seoEn: emptySeoDraft(), customCode: [] };
  const withHost = buildSparseDoc({ ...base, site: { widgetHost: "https://x.io" } });
  expect(withHost.site?.widgetHost).toBe("https://x.io");

  const without = buildSparseDoc({ ...base, site: { widgetHost: "" } });
  expect(without.site?.widgetHost).toBeUndefined();
});

// ── Task 6: customCode sparse build ──────────────────────────────────────────

test("buildSparseDoc keeps non-empty customCode, drops empty-code rows, omits when none", () => {
  const base = { site: {}, services: [], seoFr: emptySeoDraft(), seoEn: emptySeoDraft(), customCode: [] };

  expect(buildSparseDoc(base).customCode).toBeUndefined();

  const withRows = buildSparseDoc({
    ...base,
    customCode: [
      { id: "a", label: "GA4", code: "<script></script>", placement: "head", pages: ["*"], enabled: true },
      { id: "b", label: "blank", code: "   ", placement: "head", pages: ["*"], enabled: true },
    ],
  });
  expect(withRows.customCode?.map((s) => s.id)).toEqual(["a"]);
});
