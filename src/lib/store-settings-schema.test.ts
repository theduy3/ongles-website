import { describe, expect, it } from "bun:test";
import { StoreSettingsSchema } from "@/lib/store-settings-schema";

describe("StoreSettingsSchema", () => {
  it("accepts a minimal sparse valid doc", () => {
    // WHY: The schema must allow partial/sparse docs so the admin only needs to
    // store the fields they've overridden — the static config covers the rest.
    const result = StoreSettingsSchema.safeParse({
      site: { name: "X" },
      services: [{ id: "pose-ongles", price: 65 }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty object (no overrides at all)", () => {
    // WHY: A row with an empty doc is valid — it means "use static defaults".
    // Inserting an empty override must never blow up the parse.
    const result = StoreSettingsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects structural key site.nav", () => {
    // WHY: `nav` controls routing structure and must not be editable at runtime;
    // strict mode on the site section should reject it outright so callers never
    // accidentally wipe nav from the static config.
    const result = StoreSettingsSchema.safeParse({
      site: { nav: [] },
    });
    expect(result.success).toBe(false);
  });

  it("rejects structural key site.routes", () => {
    // WHY: Same rationale as nav — routes is structural, not a value field.
    const result = StoreSettingsSchema.safeParse({
      site: { routes: [] },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a slug field inside services items", () => {
    // WHY: service.slug is a locale-keyed URL segment baked at build time.
    // Allowing it to be overridden at runtime would break route resolution.
    const result = StoreSettingsSchema.safeParse({
      services: [{ id: "pose-ongles", slug: { fr: "x", en: "x" } }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown service id", () => {
    // WHY: The enum of service ids is the canonical list of services this salon
    // offers. An unknown id can't match any static service and must be rejected
    // early rather than silently ignored after the fact.
    const result = StoreSettingsSchema.safeParse({
      services: [{ id: "nope", price: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown top-level key", () => {
    // WHY: Strict mode on the outer object prevents typos (e.g. "sitte") from
    // silently being stored and then ignored, which would confuse operators.
    const result = StoreSettingsSchema.safeParse({
      sitte: { name: "X" },
    });
    expect(result.success).toBe(false);
  });

  it("accepts a full location override (all optional fields)", () => {
    // WHY: Location data (phone, hours, address) is the most commonly updated
    // section. Confirm the full valid shape is accepted before any partial.
    const result = StoreSettingsSchema.safeParse({
      location: {
        name: "Ongles Maily — Beauport",
        phone: "418-555-0001",
        phoneHref: "tel:+14185550001",
        landmark: "near Galeries Beauport",
        address: {
          line1: "1234 Rue Principale",
          line2: "Suite 5",
          street: "1234 Rue Principale",
          city: "Québec",
          region: "QC",
          postalCode: "G1E 1A1",
          country: "CA",
        },
        hours: [{ label: "Lun–Ven", value: "9h–20h" }],
        hoursSpec: [{ days: ["Mo", "Tu"], opens: "09:00", closes: "20:00" }],
        geo: { lat: 46.8, lng: -71.2 },
        bookerSlug: "maily-beauport",
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects structural location keys id and slug", () => {
    // WHY: Location id and slug are routing keys baked at build time and must
    // not be overridden at runtime or one tenant could shadow another.
    const withId = StoreSettingsSchema.safeParse({ location: { id: "x" } });
    const withSlug = StoreSettingsSchema.safeParse({ location: { slug: "x" } });
    expect(withId.success).toBe(false);
    expect(withSlug.success).toBe(false);
  });

  it("accepts content with per-locale free-form records", () => {
    // WHY: The content section carries SEO meta text overrides keyed by locale.
    // It must accept arbitrary string-keyed records (not a strict schema) so
    // new meta keys can be added in the editor without a schema migration.
    const result = StoreSettingsSchema.safeParse({
      content: {
        fr: { metaTitle: "Ongles Maily", metaDescription: "Salon de beauté" },
        en: { metaTitle: "Ongles Maily", metaDescription: "Beauty salon" },
      },
    });
    expect(result.success).toBe(true);
  });
});

// ── Task 1: widgetHost ────────────────────────────────────────────────────────

import { test, expect as bexpect } from "bun:test";

test("site.widgetHost is accepted", () => {
  const r = StoreSettingsSchema.safeParse({
    site: { widgetHost: "https://app.example.com" },
  });
  bexpect(r.success).toBe(true);
});

// ── Task: per-tenant logo ─────────────────────────────────────────────────────

test("site.logo is accepted", () => {
  const r = StoreSettingsSchema.safeParse({
    site: { logo: "https://cdn.example.com/logo.png" },
  });
  bexpect(r.success).toBe(true);
});

test("site rejects an unknown sibling key next to logo", () => {
  const r = StoreSettingsSchema.safeParse({
    site: { logo: "https://x/y.png", logoo: "typo" },
  });
  bexpect(r.success).toBe(false);
});

// ── Task: per-tenant favicon ──────────────────────────────────────────────────

test("site.favicon is accepted", () => {
  // WHY: favicon is a runtime value-only override like logo; it must pass the
  // strict site schema so the admin can persist it without a 400.
  const r = StoreSettingsSchema.safeParse({
    site: { favicon: "https://cdn.example.com/favicon.png" },
  });
  bexpect(r.success).toBe(true);
});

test("site rejects an unknown sibling key next to favicon", () => {
  // WHY: .strict() must still catch typos (faviconn) so a misnamed field is
  // never silently stored and then ignored at render time.
  const r = StoreSettingsSchema.safeParse({
    site: { favicon: "https://x/y.png", faviconn: "typo" },
  });
  bexpect(r.success).toBe(false);
});

// ── Task 3: customCode section ────────────────────────────────────────────────

test("customCode array of valid snippets parses", () => {
  const r = StoreSettingsSchema.safeParse({
    customCode: [
      { id: "a", label: "GA4", code: "<script></script>", placement: "head", pages: ["*"], enabled: true },
      { id: "b", label: "Chat", code: "x", placement: "body-end", pages: ["home", "contact"], enabled: false },
    ],
  });
  bexpect(r.success).toBe(true);
});

test("customCode rejects unknown placement and extra keys", () => {
  bexpect(
    StoreSettingsSchema.safeParse({
      customCode: [{ id: "a", label: "x", code: "y", placement: "footer", pages: [], enabled: true }],
    }).success,
  ).toBe(false);
  bexpect(
    StoreSettingsSchema.safeParse({
      customCode: [{ id: "a", label: "x", code: "y", placement: "head", pages: [], enabled: true, evil: 1 }],
    }).success,
  ).toBe(false);
});
