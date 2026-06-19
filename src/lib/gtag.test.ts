/**
 * gtag.test.ts — bun:test for src/lib/gtag.ts
 *
 * RED-first: written before the implementation. Tests are GREEN immediately
 * after the implementation lands (pure logic, no owner data required).
 *
 * Covers:
 *   - gtagEvent() calls window.gtag with the correct args when defined
 *   - gtagEvent() is a no-op (no throw) when window.gtag is undefined
 *   - ga4Events.bookOnlineClick() emits 'book_online_click' with correct params
 *   - ga4Events.callClick() emits 'call_click' with correct params
 *   - ga4Events.contactFormSubmit() emits 'contact_form_submit'
 *   - ga4Events.directionsClick() emits 'directions_click' with correct params
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { gtagEvent, ga4Events } from "./gtag";

// ─── Test helpers ──────────────────────────────────────────────────────────────

type GtagFn = (...args: unknown[]) => void;

let gtagCalls: { command: string; args: unknown[] }[];

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

// ─── gtagEvent() core behaviour ───────────────────────────────────────────────

describe("gtagEvent() — window.gtag present", () => {
  beforeEach(installSpy);
  afterEach(removeSpy);

  it("calls window.gtag('event', name, params) exactly once", () => {
    gtagEvent("book_online_click", { salon_location: "Beauport" });
    expect(gtagCalls).toHaveLength(1);
    expect(gtagCalls[0].command).toBe("event");
    expect(gtagCalls[0].args[0]).toBe("book_online_click");
    expect(gtagCalls[0].args[1]).toEqual({ salon_location: "Beauport" });
  });

  it("calls window.gtag with undefined params when none supplied", () => {
    gtagEvent("contact_form_submit");
    expect(gtagCalls).toHaveLength(1);
    expect(gtagCalls[0].command).toBe("event");
    expect(gtagCalls[0].args[0]).toBe("contact_form_submit");
  });
});

describe("gtagEvent() — window.gtag undefined (no-op)", () => {
  beforeEach(removeSpy);

  it("does not throw when window.gtag is undefined", () => {
    expect(() => gtagEvent("call_click", { phone: "+1-418-660-8228" })).not.toThrow();
  });

  it("does not throw when window itself is undefined", () => {
    expect(() => gtagEvent("directions_click")).not.toThrow();
  });
});

// ─── ga4Events emitters ───────────────────────────────────────────────────────

describe("ga4Events.bookOnlineClick()", () => {
  beforeEach(installSpy);
  afterEach(removeSpy);

  it("emits event name 'book_online_click'", () => {
    ga4Events.bookOnlineClick("Beauport");
    expect(gtagCalls[0].args[0]).toBe("book_online_click");
  });

  it("includes event_category 'conversion'", () => {
    ga4Events.bookOnlineClick("Beauport");
    expect((gtagCalls[0].args[1] as Record<string, unknown>)["event_category"]).toBe("conversion");
  });

  it("includes salon_location param matching the argument", () => {
    ga4Events.bookOnlineClick("Charlesbourg");
    expect((gtagCalls[0].args[1] as Record<string, unknown>)["salon_location"]).toBe("Charlesbourg");
  });
});

describe("ga4Events.callClick()", () => {
  beforeEach(installSpy);
  afterEach(removeSpy);

  it("emits event name 'call_click'", () => {
    ga4Events.callClick("(418) 660-8228");
    expect(gtagCalls[0].args[0]).toBe("call_click");
  });

  it("includes phone param matching the argument", () => {
    ga4Events.callClick("(418) 660-8228");
    expect((gtagCalls[0].args[1] as Record<string, unknown>)["phone"]).toBe("(418) 660-8228");
  });

  it("includes event_category 'engagement'", () => {
    ga4Events.callClick("(418) 660-8228");
    expect((gtagCalls[0].args[1] as Record<string, unknown>)["event_category"]).toBe("engagement");
  });
});

describe("ga4Events.contactFormSubmit()", () => {
  beforeEach(installSpy);
  afterEach(removeSpy);

  it("emits event name 'contact_form_submit'", () => {
    ga4Events.contactFormSubmit();
    expect(gtagCalls[0].args[0]).toBe("contact_form_submit");
  });

  it("includes event_category 'engagement'", () => {
    ga4Events.contactFormSubmit();
    expect((gtagCalls[0].args[1] as Record<string, unknown>)["event_category"]).toBe("engagement");
  });
});

describe("ga4Events.directionsClick()", () => {
  beforeEach(installSpy);
  afterEach(removeSpy);

  it("emits event name 'directions_click'", () => {
    ga4Events.directionsClick("Trois-Rivières");
    expect(gtagCalls[0].args[0]).toBe("directions_click");
  });

  it("includes salon_location param matching the argument", () => {
    ga4Events.directionsClick("Trois-Rivières");
    expect((gtagCalls[0].args[1] as Record<string, unknown>)["salon_location"]).toBe("Trois-Rivières");
  });

  it("includes event_category 'engagement'", () => {
    ga4Events.directionsClick("Trois-Rivières");
    expect((gtagCalls[0].args[1] as Record<string, unknown>)["event_category"]).toBe("engagement");
  });
});

// ─── ga4Events exact event name contract ─────────────────────────────────────

describe("ga4Events — M-03 event name contract (exact strings)", () => {
  it("ga4Events exposes exactly the four M-03 emitters", () => {
    expect(typeof ga4Events.bookOnlineClick).toBe("function");
    expect(typeof ga4Events.callClick).toBe("function");
    expect(typeof ga4Events.contactFormSubmit).toBe("function");
    expect(typeof ga4Events.directionsClick).toBe("function");
  });

  it("event names are the exact M-03 snake_case strings", () => {
    installSpy();
    ga4Events.bookOnlineClick("loc");
    ga4Events.callClick("phone");
    ga4Events.contactFormSubmit();
    ga4Events.directionsClick("loc");
    const names = gtagCalls.map((c) => c.args[0]);
    expect(names).toEqual([
      "book_online_click",
      "call_click",
      "contact_form_submit",
      "directions_click",
    ]);
    removeSpy();
  });
});
