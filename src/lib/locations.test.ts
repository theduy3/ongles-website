import { describe, expect, it } from "bun:test";
import {
  mapDirectionsLink,
  mapLink,
  bookerServiceMenu,
  locations,
} from "@/lib/locations";
import { site as staticSite } from "@/config";
import type { Location, TenantSite } from "@/config/types";

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

describe("mapDirectionsLink — dependency injection and fallback", () => {
  it("builds a Google Maps directions URL for the static tenant location", () => {
    const destination =
      staticSite.name + " " + loc.name + ", " +
      loc.address.street + ", " + loc.address.line2;

    expect(mapDirectionsLink(loc)).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=" +
        encodeURIComponent(destination),
    );
  });

  it("uses an injected tenant name in the destination", () => {
    const decoded = decodeURIComponent(mapDirectionsLink(loc, injectedSite));
    expect(decoded).toContain("Z Salon");
    expect(decoded).not.toContain(staticSite.name);
  });

  it("falls back to the injected contact address without undefined values", () => {
    const link = mapDirectionsLink(undefined, injectedSite);
    expect(link).toContain(
      "https://www.google.com/maps/dir/?api=1&destination=",
    );
    expect(decodeURIComponent(link)).toContain(
      injectedSite.contact.address.street,
    );
    expect(link).not.toContain("undefined");
  });

  it("falls back when the location destination fields are blank", () => {
    const blankLocation = {
      ...loc,
      name: "  ",
      address: {
        ...loc.address,
        street: "",
        line2: "\t",
      },
    };
    const fallbackDestination =
      injectedSite.name + ", " + injectedSite.contact.address.street + ", " +
      injectedSite.contact.address.line2;

    const link = mapDirectionsLink(blankLocation, injectedSite);

    expect(link).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=" +
        encodeURIComponent(fallbackDestination),
    );
    expect(link).not.toContain("undefined");
  });

  it("falls back when a runtime location is structurally incomplete", () => {
    const incompleteLocation = {
      ...loc,
      address: undefined,
    } as unknown as Location;
    const fallbackDestination =
      injectedSite.name + ", " + injectedSite.contact.address.street + ", " +
      injectedSite.contact.address.line2;

    const link = mapDirectionsLink(incompleteLocation, injectedSite);

    expect(link).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=" +
        encodeURIComponent(fallbackDestination),
    );
    expect(link).not.toContain("undefined");
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
