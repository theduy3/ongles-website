import { describe, expect, it } from "bun:test";

// buildSalonCards is pure (no server-only / Next deps), so it imports cleanly
// in bun:test. The trailing `activeTenantId` param lets us drive each tenant
// without depending on the module-level `tenant` singleton (process.env.TENANT).
import { buildSalonCards } from "@/components/SalonCard";
import en from "@/dictionaries/en.json";
import { onglesMaily } from "@/config/tenants/ongles-maily";
import { onglesCharlesbourg } from "@/config/tenants/ongles-charlesbourg";
import { onglesRivieres } from "@/config/tenants/ongles-rivieres";
import { onglesCite } from "@/config/tenants/ongles-cite";

const ALL = [
  "Ongles Maily",
  "Ongles Charlesbourg",
  "Ongles Rivières",
  "Ongles et Spa Québec",
] as const;

const TENANTS = [
  { id: "ongles-maily", cfg: onglesMaily, own: "Ongles Maily" },
  { id: "ongles-charlesbourg", cfg: onglesCharlesbourg, own: "Ongles Charlesbourg" },
  { id: "ongles-rivieres", cfg: onglesRivieres, own: "Ongles Rivières" },
  { id: "ongles-cite", cfg: onglesCite, own: "Ongles et Spa Québec" },
] as const;

describe("buildSalonCards — every tenant shows all salons", () => {
  for (const { id, cfg, own } of TENANTS) {
    const cards = () =>
      buildSalonCards(en, "en", cfg.site, [cfg.location], id);
    // Own card + every sister brand. Each tenant's own brand also exists as a
    // sister entry, so the set dedupes to 4 cards per tenant.
    const expected = new Set([own, ...ALL]);

    describe(id, () => {
      // T1 — own card plus every sister salon renders, exactly once each (own
      // card not duplicated by a sister entry of the same brand).
      it("shows own card plus all sister salons, no duplicates", () => {
        const names = cards().map((c) => c.name);
        expect(names).toHaveLength(expected.size);
        expect([...names].sort()).toEqual([...expected].sort());
      });

      // T2 — own store card is first; every card books via the internal
      // /book-online page (no external /reservation/ redirects).
      it("own card is first and all Book Now links are internal /book-online", () => {
        const c = cards();
        expect(c[0].name).toBe(own);
        expect(c).toHaveLength(expected.size);
        for (const card of c) {
          expect(card.bookHref).toBe("/en/book-online");
        }
      });

      // T3 — no coming-soon (Quebec) card regressions.
      it("renders no coming-soon card", () => {
        expect(cards().some((c) => c.comingSoon === true)).toBe(false);
      });
    });
  }
});
