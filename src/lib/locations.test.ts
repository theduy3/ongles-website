import { describe, expect, it } from "bun:test";
import { mapLink, bookerServiceMenu, locations } from "@/lib/locations";
import { site as staticSite } from "@/config";
import type { TenantSite } from "@/config/types";

const loc = locations[0];

// Minimal site override — only fields mapLink/bookerServiceMenu touch.
const injectedSite = {
  ...staticSite,
  name: "Z Salon",
  booker: { ...staticSite.booker, brand: "https://injected.booker.example.com" },
} satisfies TenantSite;

describe("mapLink — dependency injection", () => {
  it("uses static site.name when no site arg is passed", () => {
    // WHY: Existing callers pass only `loc` and must still compile + work.
    const link = decodeURIComponent(mapLink(loc));
    expect(link).toContain(staticSite.name);
  });

  it("uses injected site.name when site arg is passed", () => {
    // WHY: DI contract — seo.ts passes cfg.site here so the map link reflects
    // the runtime-overridden brand name rather than the static default.
    const link = decodeURIComponent(mapLink(loc, injectedSite));
    expect(link).toContain("Z Salon");
    expect(link).not.toContain(staticSite.name);
  });
});

describe("bookerServiceMenu — dependency injection", () => {
  it("uses static booker.brand when no site arg is passed", () => {
    // WHY: Backward-compat for existing one-arg callers.
    const url = bookerServiceMenu(loc);
    expect(url).toBe(staticSite.booker.brand);
  });

  it("uses injected booker.brand when site arg is passed", () => {
    // WHY: Admin overrides can point to a different booking URL per tenant.
    const url = bookerServiceMenu(loc, injectedSite);
    expect(url).toBe("https://injected.booker.example.com");
  });
});
