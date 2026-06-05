import { describe, it, expect } from "bun:test";
import { buildSparseDoc, extractMeta } from "./settings-draft";
import type { SettingsDraftState } from "./settings-draft";

const empty: SettingsDraftState = {
  site: {},
  services: [],
  contentFr: {},
  contentEn: {},
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

  it("wraps content meta under { meta: ... }", () => {
    const doc = buildSparseDoc({
      ...empty,
      contentEn: { homeTitle: "My Title" },
    });
    expect(doc.content?.en).toEqual({ meta: { homeTitle: "My Title" } });
  });

  it("omits content when all meta values are empty", () => {
    const doc = buildSparseDoc({
      ...empty,
      contentEn: { homeTitle: "" },
    });
    expect(doc.content).toBeUndefined();
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

describe("extractMeta", () => {
  it("returns empty object when undefined", () => {
    expect(extractMeta(undefined)).toEqual({});
  });

  it("extracts meta key from locale object", () => {
    expect(extractMeta({ meta: { homeTitle: "Hello" } })).toEqual({
      homeTitle: "Hello",
    });
  });

  it("returns empty object when meta is not an object", () => {
    expect(extractMeta({ meta: "bad" })).toEqual({});
  });
});
