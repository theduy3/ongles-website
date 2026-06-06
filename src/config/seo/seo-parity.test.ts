import { describe, it, expect } from "bun:test";

// FR ⇔ EN key-structure parity for every SEO file (base + each tenant). The
// SeoDictionary type derives from seo.en.json with no compile-time guard that
// fr.json matches — this test is that guard (mirrors the AGENTS.md hard rule).

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
