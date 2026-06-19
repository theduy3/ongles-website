/**
 * DirectionsLink.test.tsx — bun:test for the DirectionsLink client island.
 *
 * DirectionsLink is a 'use client' anchor that wraps a Google Maps link and
 * fires ga4Events.directionsClick on click.
 *
 * We test the exported pure click-handler factory (same pattern as
 * FloatingCTAButtons) with a window.gtag spy.
 *
 * Covers (per plan behavior block):
 *   - onClick calls ga4Events.directionsClick(salonLocation)
 *     → emits 'directions_click' with event_category: 'engagement'
 *   - No-op when window.gtag is absent (SSR / pre-consent)
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";

import { makeDirectionsClickHandler } from "./DirectionsLink";

// ─── Spy helpers ───────────────────────────────────────────────────────────────

type GtagCall = { command: string; args: unknown[] };
let gtagCalls: GtagCall[];

function installSpy() {
  gtagCalls = [];
  (globalThis as Record<string, unknown>).window = {
    gtag: (...args: unknown[]) => {
      const [command, ...rest] = args;
      gtagCalls.push({ command: command as string, args: rest });
    },
  };
}

function removeSpy() {
  (globalThis as Record<string, unknown>).window = undefined;
  gtagCalls = [];
}

// ─── directions_click event ───────────────────────────────────────────────────

describe("makeDirectionsClickHandler()", () => {
  beforeEach(installSpy);
  afterEach(removeSpy);

  it("fires ga4Events.directionsClick with the salon location", () => {
    const handler = makeDirectionsClickHandler("Beauport");
    handler();
    expect(gtagCalls).toHaveLength(1);
    expect(gtagCalls[0].command).toBe("event");
    expect(gtagCalls[0].args[0]).toBe("directions_click");
    expect(gtagCalls[0].args[1]).toMatchObject({
      event_category: "engagement",
      salon_location: "Beauport",
    });
  });

  it("fires once per call", () => {
    const handler = makeDirectionsClickHandler("Charlesbourg");
    handler();
    handler();
    expect(gtagCalls).toHaveLength(2);
  });

  it("is a no-op when window.gtag is absent (SSR / pre-consent)", () => {
    removeSpy();
    const handler = makeDirectionsClickHandler("Beauport");
    expect(() => handler()).not.toThrow();
    expect(gtagCalls ?? []).toHaveLength(0);
  });

  it("returns a function", () => {
    const handler = makeDirectionsClickHandler("Rivières");
    expect(typeof handler).toBe("function");
  });
});
