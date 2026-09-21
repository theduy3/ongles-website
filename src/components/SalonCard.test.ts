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

const ALL = ["Ongles Maily", "Ongles Charlesbourg", "Ongles Rivières"] as const;

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
    // Own card + every sister brand. For tenants whose own brand is also a
    // sister entry the set dedupes to 3; ongles-cite has no sister card yet,
    // so it renders its own card plus all 3 sisters = 4.
    const expected = new Set([own, ...ALL]);

    describe(id, () => {
      // T1 — own card plus every sister salon renders, exactly once each (own
      // card not duplicated by a sister entry of the same brand).
      it("shows own card plus all sister salons, no duplicates", () => {
        const names = cards().map((c) => c.name);
        expect(names).toHaveLength(expected.size);
        expect([...names].sort()).toEqual([...expected].sort());
      });

      // T2 — own store card is first and books via the internal /book-online page;
      // the other salons keep external links.
      it("own card is internal /book-online, others external", () => {
        const c = cards();
        expect(c[0].name).toBe(own);
        expect(c[0].bookHref).toBe("/en/book-online");
        const others = c.filter((x) => x.name !== own);
        expect(others).toHaveLength(expected.size - 1);
        for (const o of others) expect(o.bookHref).toMatch(/^https:\/\//);
      });

      // T3 — no coming-soon (Quebec) card regressions.
      it("renders no coming-soon card", () => {
        expect(cards().some((c) => c.comingSoon === true)).toBe(false);
      });
    });
  }
});
