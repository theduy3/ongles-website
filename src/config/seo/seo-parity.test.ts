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

// ─── F-02 extension: Phase-3 answerBlock + per-tenant FAQ parity ──────────────
// Guards FR/EN drift as 03-04 authors answerBlock/answerHeading and 03-03 authors
// per-tenant faq.{locale}.json. Passes now (identical empty strings / 0 items).

import mailyFaqFr from "../tenants/ongles-maily/faq.fr.json";
import mailyFaqEn from "../tenants/ongles-maily/faq.en.json";
import charlesbourgFaqFr from "../tenants/ongles-charlesbourg/faq.fr.json";
import charlesbourgFaqEn from "../tenants/ongles-charlesbourg/faq.en.json";
import rivieresFaqFr from "../tenants/ongles-rivieres/faq.fr.json";
import rivieresFaqEn from "../tenants/ongles-rivieres/faq.en.json";

type SeoDoc = {
  meta: Record<string, string>;
  services: Record<string, Record<string, string>>;
  locations: { answerBlock: string; answerHeading: string };
};
type FaqDoc = { items: Array<Record<string, string>> };

const seoTenantPairs: Array<[string, SeoDoc, SeoDoc]> = [
  ["ongles-maily", mailyFr as unknown as SeoDoc, mailyEn as unknown as SeoDoc],
  ["ongles-charlesbourg", charlesbourgFr as unknown as SeoDoc, charlesbourgEn as unknown as SeoDoc],
  ["ongles-rivieres", rivieresFr as unknown as SeoDoc, rivieresEn as unknown as SeoDoc],
];

const faqTenantPairs: Array<[string, FaqDoc, FaqDoc]> = [
  ["ongles-maily", mailyFaqFr as FaqDoc, mailyFaqEn as FaqDoc],
  ["ongles-charlesbourg", charlesbourgFaqFr as FaqDoc, charlesbourgFaqEn as FaqDoc],
  ["ongles-rivieres", rivieresFaqFr as FaqDoc, rivieresFaqEn as FaqDoc],
];

describe("F-02 extension: seo answerBlock/answerHeading key parity FR/EN per tenant", () => {
  for (const [name, fr, en] of seoTenantPairs) {
    it(`${name}: service keyPaths identical fr/en for all service ids`, () => {
      for (const slug of SERVICE_IDS) {
        expect(keyPaths(fr.services[slug])).toEqual(keyPaths(en.services[slug]));
      }
    });

    it(`${name}: home/services/locations + per-service answer keys defined in both locales`, () => {
      for (const doc of [fr, en]) {
        expect(typeof doc.meta.homeAnswerBlock).toBe("string");
        expect(typeof doc.meta.homeAnswerHeading).toBe("string");
        expect(typeof doc.meta.servicesAnswerBlock).toBe("string");
        expect(typeof doc.meta.servicesAnswerHeading).toBe("string");
        expect(typeof doc.locations.answerBlock).toBe("string");
        expect(typeof doc.locations.answerHeading).toBe("string");
        for (const slug of SERVICE_IDS) {
          expect(typeof doc.services[slug].answerBlock).toBe("string");
          expect(typeof doc.services[slug].answerHeading).toBe("string");
        }
      }
    });
  }
});

describe("F-02 extension: per-tenant faq.{locale}.json key parity", () => {
  for (const [name, fr, en] of faqTenantPairs) {
    it(`${name}: faq items arrays have the same length`, () => {
      expect(fr.items.length).toBe(en.items.length);
    });

    it(`${name}: every faq item has identical key structure fr/en`, () => {
      for (let i = 0; i < en.items.length; i++) {
        expect(keyPaths(fr.items[i])).toEqual(keyPaths(en.items[i]));
      }
    });
  }
});

// ─── Phase 4: pages.* key parity — base + tenant seo JSON ───────────────────
// RED: these keys don't exist yet in base seo.{fr,en}.json or tenant seo files.
// Task 2 (GREEN) scaffolds them in all files. The tests below will FAIL until then.

// Widen SeoDoc to include the new pages namespace.
type SeoDocWithPages = SeoDoc & {
  pages?: {
    pricing?: {
      answerHeading?: string;
      answerBlock?: string;
    };
    comparison?: Record<string, {
      answerHeading?: string;
      answerBlock?: string;
      body?: string;
    }>;
    nearMe?: {
      answerHeading?: string;
      answerBlock?: string;
    };
  };
};

const COMPARISON_SLUGS = [
  "pose-vs-remplissage",
  "manucure-vs-pedicure",
  "gel-vs-acrylique",
  "meilleur-pour",
] as const;

// All files checked: base + 3 tenants.
const allPairs: Array<[string, SeoDocWithPages, SeoDocWithPages]> = [
  ["base", baseFr as unknown as SeoDocWithPages, baseEn as unknown as SeoDocWithPages],
  ["ongles-maily", mailyFr as unknown as SeoDocWithPages, mailyEn as unknown as SeoDocWithPages],
  ["ongles-charlesbourg", charlesbourgFr as unknown as SeoDocWithPages, charlesbourgEn as unknown as SeoDocWithPages],
  ["ongles-rivieres", rivieresFr as unknown as SeoDocWithPages, rivieresEn as unknown as SeoDocWithPages],
];

describe("Phase 4: pages.pricing keys — typeof string in fr+en (base + 3 tenants)", () => {
  for (const [name, fr, en] of allPairs) {
    it(`${name}: pages.pricing.answerBlock is typeof string in both locales`, () => {
      expect(typeof fr.pages?.pricing?.answerBlock).toBe("string");
      expect(typeof en.pages?.pricing?.answerBlock).toBe("string");
    });

    it(`${name}: pages.pricing.answerHeading is typeof string in both locales`, () => {
      expect(typeof fr.pages?.pricing?.answerHeading).toBe("string");
      expect(typeof en.pages?.pricing?.answerHeading).toBe("string");
    });
  }
});

describe("Phase 4: pages.comparison keys — typeof string in fr+en (base + 3 tenants)", () => {
  for (const [name, fr, en] of allPairs) {
    for (const slug of COMPARISON_SLUGS) {
      it(`${name}: pages.comparison.${slug}.body is typeof string in both locales`, () => {
        expect(typeof fr.pages?.comparison?.[slug]?.body).toBe("string");
        expect(typeof en.pages?.comparison?.[slug]?.body).toBe("string");
      });
    }
  }
});

describe("Phase 4: pages.nearMe keys — typeof string in fr+en (base + 3 tenants)", () => {
  for (const [name, fr, en] of allPairs) {
    it(`${name}: pages.nearMe.answerBlock is typeof string in both locales`, () => {
      expect(typeof fr.pages?.nearMe?.answerBlock).toBe("string");
      expect(typeof en.pages?.nearMe?.answerBlock).toBe("string");
    });

    it(`${name}: pages.nearMe.answerHeading is typeof string in both locales`, () => {
      expect(typeof fr.pages?.nearMe?.answerHeading).toBe("string");
      expect(typeof en.pages?.nearMe?.answerHeading).toBe("string");
    });
  }
});
