/**
 * ContactForm.test.tsx — bun:test for ContactForm GA4 instrumentation.
 *
 * ContactForm is a 'use client' component with fetch + React state. We cannot
 * DOM-render it in bun:test, so we test the exported pure helper that wraps
 * the ga4Events.contactFormSubmit() call.
 *
 * Strategy: export a `fireContactFormSubmitEvent` helper from ContactForm.tsx
 * and unit-test it with a window.gtag spy (same pattern as FloatingCTAButtons).
 *
 * Covers (per plan behavior block):
 *   - On a successful submit, fireContactFormSubmitEvent() calls
 *     ga4Events.contactFormSubmit() → emits 'contact_form_submit'
 *     with event_category: 'engagement'
 *   - No-op when window.gtag is absent (SSR / pre-consent)
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";

import { fireContactFormSubmitEvent } from "./ContactForm";

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

// ─── contactFormSubmit event ──────────────────────────────────────────────────

describe("fireContactFormSubmitEvent()", () => {
  beforeEach(installSpy);
  afterEach(removeSpy);

  it("fires ga4Events.contactFormSubmit → emits 'contact_form_submit'", () => {
    fireContactFormSubmitEvent();
    expect(gtagCalls).toHaveLength(1);
    expect(gtagCalls[0].command).toBe("event");
    expect(gtagCalls[0].args[0]).toBe("contact_form_submit");
    expect(gtagCalls[0].args[1]).toMatchObject({
      event_category: "engagement",
    });
  });

  it("is a no-op when window.gtag is absent (SSR / pre-consent)", () => {
    removeSpy();
    expect(() => fireContactFormSubmitEvent()).not.toThrow();
    expect(gtagCalls ?? []).toHaveLength(0);
  });

  it("emits exactly one event per call", () => {
    fireContactFormSubmitEvent();
    fireContactFormSubmitEvent();
    expect(gtagCalls).toHaveLength(2);
  });
});
