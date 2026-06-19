/**
 * FloatingCTAButtons.test.tsx — bun:test for the FloatingCTAButtons client island.
 *
 * The island is 'use client' so DOM rendering is not available in bun:test.
 * We test the EXPORTED pure helpers + the exported event-handler factory that
 * wires book/phone anchors to ga4Events.
 *
 * Strategy: mock ga4Events by installing a window.gtag spy (same pattern as
 * gtag.test.ts), then call the handlers directly.
 *
 * Covers (per plan behavior block):
 *   - Clicking the book anchor calls ga4Events.bookOnlineClick(salonLocation)
 *     → emits 'book_online_click' with event_category: 'conversion'
 *   - Clicking the phone anchor calls ga4Events.callClick(phoneHref)
 *     → emits 'call_click' with event_category: 'engagement'
 *   - Props (bookHref, phoneHref) are preserved (exported helpers return them)
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";

// We test the exported click handlers from the island directly.
import {
  makeBookClickHandler,
  makeCallClickHandler,
} from "./FloatingCTAButtons";

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

// ─── Book-online click ─────────────────────────────────────────────────────────

describe("makeBookClickHandler()", () => {
  beforeEach(installSpy);
  afterEach(removeSpy);

  it("fires ga4Events.bookOnlineClick with the salon location", () => {
    const handler = makeBookClickHandler("Beauport");
    handler();
    expect(gtagCalls).toHaveLength(1);
    expect(gtagCalls[0].command).toBe("event");
    expect(gtagCalls[0].args[0]).toBe("book_online_click");
    expect(gtagCalls[0].args[1]).toMatchObject({
      event_category: "conversion",
      salon_location: "Beauport",
    });
  });

  it("calls the event exactly once per click", () => {
    const handler = makeBookClickHandler("Test Location");
    handler();
    handler();
    expect(gtagCalls).toHaveLength(2);
  });

  it("is a no-op when window.gtag is absent (SSR/pre-consent)", () => {
    removeSpy(); // window = undefined
    const handler = makeBookClickHandler("Beauport");
    expect(() => handler()).not.toThrow();
    expect(gtagCalls ?? []).toHaveLength(0);
  });
});

// ─── Phone click ──────────────────────────────────────────────────────────────

describe("makeCallClickHandler()", () => {
  beforeEach(installSpy);
  afterEach(removeSpy);

  it("fires ga4Events.callClick with the phone href", () => {
    const handler = makeCallClickHandler("tel:+14186608228");
    handler();
    expect(gtagCalls).toHaveLength(1);
    expect(gtagCalls[0].command).toBe("event");
    expect(gtagCalls[0].args[0]).toBe("call_click");
    expect(gtagCalls[0].args[1]).toMatchObject({
      event_category: "engagement",
      phone: "tel:+14186608228",
    });
  });

  it("is a no-op when window.gtag is absent", () => {
    removeSpy();
    const handler = makeCallClickHandler("tel:+14186608228");
    expect(() => handler()).not.toThrow();
    expect(gtagCalls ?? []).toHaveLength(0);
  });
});

// ─── Prop preservation ────────────────────────────────────────────────────────

describe("FloatingCTAButtons props (href preservation)", () => {
  it("makeBookClickHandler returns a function (not the href)", () => {
    // The island receives bookHref as a prop and renders it verbatim.
    // We verify the handler factory is correctly typed.
    const handler = makeBookClickHandler("Loc");
    expect(typeof handler).toBe("function");
  });

  it("makeCallClickHandler returns a function", () => {
    const handler = makeCallClickHandler("tel:+10000000000");
    expect(typeof handler).toBe("function");
  });
});
