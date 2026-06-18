import { describe, it, expect } from "bun:test";

// FR ⇔ EN key-structure parity for every SEO file (base + each tenant). The
// SeoDictionary type derives from seo.en.json with no compile-time guard that
// fr.json matches — this test is that guard (mirrors the AGENTS.md hard rule).
//
// F-02: Also covers dictionaries/{en,fr}.json faq.items key-structure parity.
// The Dictionary type derives from en.json — FR keys are unchecked at compile
// time, so a missing faq.items[n].q or .a silently becomes undefined at runtime.

import baseEn from "./seo.en.json";
import baseFr from "./seo.fr.json";
import mailyEn from "../tenants/ongles-maily/seo.en.json";
import mailyFr from "../tenants/ongles-maily/seo.fr.json";
import charlesbourgEn from "../tenants/ongles-charlesbourg/seo.en.json";
import charlesbourgFr from "../tenants/ongles-charlesbourg/seo.fr.json";
import rivieresEn from "../tenants/ongles-rivieres/seo.en.json";
import rivieresFr from "../tenants/ongles-rivieres/seo.fr.json";

const SERVICE_IDS = ["pose-ongles", "remplissage", "soins-mains", "soins-pieds"];

// Recursive set of dotted key paths to every scalar leaf.
function keyPaths(obj: unknown, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object") return [prefix];
  return Object.entries(obj as Record<string, unknown>)
    .flatMap(([k, v]) => keyPaths(v, prefix ? `${prefix}.${k}` : k))
    .sort();
}

const pairs: Array<[string, object, object]> = [
  ["base", baseFr, baseEn],
  ["ongles-maily", mailyFr, mailyEn],
  ["ongles-charlesbourg", charlesbourgFr, charlesbourgEn],
  ["ongles-rivieres", rivieresFr, rivieresEn],
];

describe("SEO fr/en parity", () => {
  for (const [name, fr, en] of pairs) {
    it(`${name}: fr and en have identical key paths`, () => {
      expect(keyPaths(fr)).toEqual(keyPaths(en));
    });
  }
});

describe("SEO key constraints", () => {
  for (const [name, , en] of pairs) {
    it(`${name}: service keys are within the service-id set`, () => {
      const services = (en as { services?: Record<string, unknown> }).services ?? {};
      for (const id of Object.keys(services)) {
        expect(SERVICE_IDS).toContain(id);
      }
    });
  }

  it("base defines all four services (type source must be fully populated)", () => {
    const services = (baseEn as { services: Record<string, unknown> }).services;
    expect(Object.keys(services).sort()).toEqual([...SERVICE_IDS].sort());
  });
});

// ─── F-02: dictionaries/faq.items FR ⇔ EN parity ────────────────────────────

import frDict from "../../dictionaries/fr.json";
import enDict from "../../dictionaries/en.json";

describe("F-02: dictionaries faq.items FR/EN parity", () => {
  it("fr and en dictionaries have identical faq top-level key structure", () => {
    expect(keyPaths(frDict.faq)).toEqual(keyPaths(enDict.faq));
  });

  it("fr and en faq.items arrays have the same length", () => {
    expect(frDict.faq.items.length).toBe(enDict.faq.items.length);
  });

  it("every fr faq.items entry has identical key structure to the corresponding en entry", () => {
    const frItems = frDict.faq.items;
    const enItems = enDict.faq.items;
    for (let i = 0; i < enItems.length; i++) {
      expect(keyPaths(frItems[i])).toEqual(keyPaths(enItems[i]));
    }
  });

  it("every fr faq.items entry has non-empty q and a", () => {
    for (const [i, item] of frDict.faq.items.entries()) {
      expect(item.q.trim(), `fr faq.items[${i}].q is empty`).not.toBe("");
      expect(item.a.trim(), `fr faq.items[${i}].a is empty`).not.toBe("");
    }
  });

  it("every en faq.items entry has non-empty q and a", () => {
    for (const [i, item] of enDict.faq.items.entries()) {
      expect(item.q.trim(), `en faq.items[${i}].q is empty`).not.toBe("");
      expect(item.a.trim(), `en faq.items[${i}].a is empty`).not.toBe("");
    }
  });
});
