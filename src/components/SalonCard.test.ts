import { describe, expect, it } from "bun:test";

// buildSalonCards is pure (no server-only / Next deps), so it imports cleanly
// in bun:test. The module-level `tenant` resolves to the default "ongles-maily"
// (process.env.TENANT unset), so on this tenant nothing is excluded from the
// cross-promo and Maily uniquely shows the full network.
import { buildSalonCards } from "@/components/SalonCard";
import en from "@/dictionaries/en.json";
import { onglesMaily } from "@/config/tenants/ongles-maily";

const cards = () =>
  buildSalonCards(en, "en", onglesMaily.site, [onglesMaily.location]);

describe("buildSalonCards", () => {
  // T1 — the "New Store in Quebec City" coming-soon card is hidden everywhere.
  it("renders no coming-soon card", () => {
    expect(cards().some((c) => c.comingSoon === true)).toBe(false);
  });

  // T2 — under the default (Maily) tenant the full network shows: own + both
  // sisters = 3 cards (one tenant shows all; satellites show fewer).
  it("shows exactly the 3 network salons on the Maily tenant", () => {
    const c = cards();
    expect(c).toHaveLength(3);
    const names = c.map((x) => x.name);
    expect(names).toContain("Ongles Maily");
    expect(names).toContain("Ongles Charlesbourg");
    expect(names).toContain("Ongles Rivières");
  });

  // T3 — the active tenant's OWN store Book Now points at the internal
  // /book-online page (renders that tenant's widget), NOT an external URL.
  it("links the own-store Book Now to the internal /book-online page", () => {
    expect(cards()[0].bookHref).toBe("/en/book-online");
  });

  // T3 — sister salons keep their own external reservation links.
  it("keeps external reservation links on sister salons", () => {
    const sister = cards().find((c) => c.name === "Ongles Charlesbourg");
    expect(sister?.bookHref).toMatch(/^https:\/\//);
  });
});
