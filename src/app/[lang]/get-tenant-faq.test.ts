import { describe, it, expect, beforeAll, mock } from "bun:test";
import type { FaqItem } from "@/config/types";

// get-tenant-faq.ts has `import "server-only"` + react cache (request-time loader).
// Mock those, then dynamic-import the module so the pure mergeFaqItems is testable
// in bun:test (same approach as seo-content.test.ts / dictionaries.test.ts).
mock.module("server-only", () => ({}));

let mergeFaqItems: (
  base: readonly FaqItem[],
  tenantItems: readonly FaqItem[],
) => FaqItem[];

beforeAll(async () => {
  ({ mergeFaqItems } = await import("./get-tenant-faq"));
});

// D-06 — per-tenant high-intent facts lead, then the de-tenanted base. Merge is
// pure (new array, no mutation) and `a` stays plain text (D-30: link is separate).

const base: FaqItem[] = [
  { q: "Base Q1", a: "Base A1" },
  { q: "Base Q2", a: "Base A2" },
];
const tenantItems: FaqItem[] = [
  { q: "Tenant Q1", a: "Tenant A1", link: { href: "/book", label: "Book" } },
];

describe("mergeFaqItems (D-06)", () => {
  it("returns tenant items first, then base items (intent order)", () => {
    const merged = mergeFaqItems(base, tenantItems);
    expect(merged.map((i) => i.q)).toEqual(["Tenant Q1", "Base Q1", "Base Q2"]);
  });

  it("returns a NEW array and mutates neither input", () => {
    const baseSnapshot = [...base];
    const tenantSnapshot = [...tenantItems];
    const merged = mergeFaqItems(base, tenantItems);
    expect(merged).not.toBe(base);
    expect(merged).not.toBe(tenantItems);
    expect(base).toEqual(baseSnapshot);
    expect(tenantItems).toEqual(tenantSnapshot);
  });

  it("keeps every item's `a` field as a plain string (no markup)", () => {
    const merged = mergeFaqItems(base, tenantItems);
    for (const item of merged) {
      expect(typeof item.a).toBe("string");
      expect(item.a).not.toContain("<a");
    }
  });

  it("with an empty tenant list, merged length equals base length", () => {
    const merged = mergeFaqItems(base, []);
    expect(merged).toHaveLength(base.length);
    expect(merged.map((i) => i.q)).toEqual(["Base Q1", "Base Q2"]);
  });

  it("accepts both {q,a} and {q,a,link} item shapes", () => {
    const plain: FaqItem = { q: "Q", a: "A" };
    const linked: FaqItem = { q: "Q", a: "A", link: { href: "/x", label: "X" } };
    const merged = mergeFaqItems([plain], [linked]);
    expect(merged).toHaveLength(2);
    expect(merged[0].link?.href).toBe("/x");
  });
});
