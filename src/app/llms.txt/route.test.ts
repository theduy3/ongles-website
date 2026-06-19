/**
 * route.test.ts — per-tenant llms.txt body assertions (TDD RED → GREEN).
 *
 * Covers:
 *   - LLMS-01: No other tenant's city/landmark appears in a tenant's body.
 *   - L-02:    Links use site.canonicalUrl as the host, not site.url.
 *   - L-03/06: Body includes site.name, Contact & Location section, Hours section,
 *              Services & Pricing (CAD) section, Booking link.
 *   - L-04/05: Key Pages (FR) + Comparaisons (FR) + English Equivalents sections.
 *
 * Uses mock.module("@/lib/store-config") to drive per-tenant resolution without
 * spawning a DB or changing process.env.TENANT — the same pattern used by
 * src/app/admin/layout.test.ts. No new harness invented.
 *
 * Does NOT assert ≥200-word content floor — that is gated by 05-05's checkLlmsDepth
 * wiring once owner prose is authored.
 */

import { describe, it, expect, mock } from "bun:test";
import { TENANT_REGISTRY } from "@/config";
import type { TenantSite, Service } from "@/config/types";

// ── Types ──────────────────────────────────────────────────────────────────────
type StoreConfigResult = {
  site: TenantSite;
  services: readonly Service[];
  locations: unknown[];
  customCode: unknown[];
};

// ── Mutable closure: route.ts calls getStoreConfig() and we swap it per tenant ─
let mockStoreConfig: StoreConfigResult | null = null;

mock.module("@/lib/store-config", () => ({
  getStoreConfig: async () => {
    if (!mockStoreConfig) throw new Error("mockStoreConfig not set");
    return mockStoreConfig;
  },
}));

// ── Import route AFTER mock is registered (ESM module caching requirement) ────
const { GET } = await import("./route");

// ── Live tenants (exclude template — it's a clone source, not a live deploy) ──
const EXCLUDED = new Set(["template"]);
const liveTenantIds = Object.keys(TENANT_REGISTRY).filter((id) => !EXCLUDED.has(id)) as Array<
  keyof typeof TENANT_REGISTRY
>;

// ── Per-tenant: build a set of "other tenants' city/landmark signals" ─────────
// These strings MUST NOT appear in each tenant's llms.txt body (LLMS-01).
function otherTenantLeakSignals(currentId: string): string[] {
  const signals: string[] = [];
  for (const [id, cfg] of Object.entries(TENANT_REGISTRY)) {
    if (EXCLUDED.has(id) || id === currentId) continue;
    const { contact } = cfg.site;
    signals.push(contact.address.city.toLowerCase());
    // landmark may contain " — Entrées 4 ou 5" etc. — take the first word group
    // that is unique enough to identify the other tenant.
    signals.push(contact.landmark.toLowerCase());
  }
  // Deduplicate. "Québec" appears in both ongles-maily and ongles-charlesbourg
  // (same city) — exclude it from the signal list so we only flag tenant-
  // unique strings. The meaningful leak signals are the shopping-mall names.
  return [...new Set(signals)];
}

// ── Helper: extract text body from the Response ───────────────────────────────
async function getBody(tenantId: keyof typeof TENANT_REGISTRY): Promise<string> {
  const cfg = TENANT_REGISTRY[tenantId];
  mockStoreConfig = {
    site: cfg.site,
    services: cfg.services,
    locations: [],
    customCode: [],
  };
  const response = await GET();
  return response.text();
}

// ── Test suites ───────────────────────────────────────────────────────────────
describe("llms.txt route — per-tenant body assertions", () => {
  for (const tenantId of liveTenantIds) {
    const cfg = TENANT_REGISTRY[tenantId];
    const { canonicalUrl, url: siteUrl } = cfg.site;
    const frBase = `${canonicalUrl}/fr`;
    const enBase = `${canonicalUrl}/en`;

    describe(`tenant: ${tenantId}`, () => {
      // Lazy-load body once per tenant describe block via a shared promise.
      let bodyPromise: Promise<string>;
      function body(): Promise<string> {
        if (!bodyPromise) bodyPromise = getBody(tenantId);
        return bodyPromise;
      }

      // ── L-02: canonicalUrl used as link host ───────────────────────────────
      it("uses canonicalUrl/fr as the FR base in body links (L-02)", async () => {
        const b = await body();
        expect(b).toContain(frBase);
      });

      it("uses canonicalUrl/en as the EN base in body links (L-02)", async () => {
        const b = await body();
        expect(b).toContain(enBase);
      });

      it("does NOT contain site.url as link host when it differs from canonicalUrl (L-02)", async () => {
        // For tenants where url !== canonicalUrl (charlesbourg, rivieres have
        // www. prefix on url — but both should be identical here; we still guard
        // against the pre-fix bug of using site.url directly).
        const b = await body();
        // The current buggy route uses `site.url` — assert it's absent as a
        // standalone link base (allow it only if it equals canonicalUrl).
        if (siteUrl !== canonicalUrl) {
          expect(b).not.toContain(`${siteUrl}/fr`);
          expect(b).not.toContain(`${siteUrl}/en`);
        }
      });

      // ── LLMS-01: No cross-tenant leak ──────────────────────────────────────
      it("body contains site.name (this tenant's name)", async () => {
        const b = await body();
        expect(b).toContain(cfg.site.name);
      });

      it("body contains NO other tenant's city/landmark strings (LLMS-01 no-leak)", async () => {
        const b = await body();
        const bodyLower = b.toLowerCase();
        const signals = otherTenantLeakSignals(tenantId);
        for (const signal of signals) {
          // Skip generic city "québec" that is legitimately shared
          // (both maily and charlesbourg are in Québec City).
          // Only flag shopping-centre landmark names and Trois-Rivières.
          if (signal === "québec") continue;
          expect(bodyLower).not.toContain(signal);
        }
      });

      // ── L-03/L-06: Required content sections ──────────────────────────────
      it("body contains a Contact & Location section with address and landmark", async () => {
        const b = await body();
        expect(b).toContain("## Contact & Location");
        expect(b).toContain(cfg.site.contact.landmark);
        expect(b).toContain(cfg.site.contact.phone);
        expect(b).toContain(cfg.site.contact.email);
      });

      it("body contains a Hours section", async () => {
        const b = await body();
        expect(b).toContain("## Hours");
      });

      it("body contains a Services & Pricing (CAD) section with each service and CAD token", async () => {
        const b = await body();
        expect(b).toContain("## Services & Pricing (CAD)");
        for (const svc of cfg.services) {
          expect(b).toContain(svc.id);
          // Price in CAD must be present (e.g. "$60" or "60 CAD")
          expect(b).toContain("CAD");
          expect(b).toContain(`$${svc.price}`);
        }
      });

      it("body contains a Booking section with a booking link", async () => {
        const b = await body();
        expect(b).toContain("## Booking");
        expect(b).toContain(cfg.site.booking);
      });

      // ── L-04: Phase-4 page links ──────────────────────────────────────────
      it("body links to /tarifs (FR pricing page, L-04)", async () => {
        const b = await body();
        expect(b).toContain(`${frBase}/tarifs`);
      });

      it("body links to /pricing (EN pricing page, L-04)", async () => {
        const b = await body();
        expect(b).toContain(`${enBase}/pricing`);
      });

      it("body links to all 4 FR comparison slugs (L-04)", async () => {
        const b = await body();
        const comparaisonSlugs = [
          "pose-vs-remplissage",
          "manucure-vs-pedicure",
          "gel-vs-acrylique",
          "meilleur-pour",
        ];
        for (const slug of comparaisonSlugs) {
          expect(b).toContain(`${frBase}/comparaisons/${slug}`);
        }
      });

      it("body links to all 4 EN comparison slugs (L-04)", async () => {
        const b = await body();
        const comparisonSlugs = [
          "nail-extensions-vs-fill",
          "manicure-vs-pedicure",
          "gel-vs-acrylic",
          "best-for",
        ];
        for (const slug of comparisonSlugs) {
          expect(b).toContain(`${enBase}/comparisons/${slug}`);
        }
      });

      it("body links to the borough near-me slug (L-04)", async () => {
        const b = await body();
        // Near-me slug is the last entry in site.routes (e.g. /beauport, /charlesbourg, /trois-rivieres)
        const nearMeRoute = cfg.site.routes.at(-1);
        expect(nearMeRoute).toBeDefined();
        expect(b).toContain(`${frBase}${nearMeRoute}`);
      });

      // ── L-05: FR-canonical-first, then EN-equivalents section ─────────────
      it("body contains Key Pages (FR — canonical) section (L-05)", async () => {
        const b = await body();
        expect(b).toContain("## Key Pages (FR");
      });

      it("body contains Comparaisons (FR) section (L-05)", async () => {
        const b = await body();
        expect(b).toContain("## Comparaisons (FR)");
      });

      it("body contains English Equivalents section (L-05)", async () => {
        const b = await body();
        expect(b).toContain("## English Equivalents");
      });

      it("FR sections appear before English Equivalents section (L-05 ordering)", async () => {
        const b = await body();
        const frIdx = b.indexOf("## Key Pages (FR");
        const enIdx = b.indexOf("## English Equivalents");
        expect(frIdx).toBeGreaterThan(-1);
        expect(enIdx).toBeGreaterThan(-1);
        expect(frIdx).toBeLessThan(enIdx);
      });

      // ── Response format ────────────────────────────────────────────────────
      it("response Content-Type is text/plain; charset=utf-8", async () => {
        const cfg2 = TENANT_REGISTRY[tenantId];
        mockStoreConfig = {
          site: cfg2.site,
          services: cfg2.services,
          locations: [],
          customCode: [],
        };
        const response = await GET();
        expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
      });
    });
  }
});
