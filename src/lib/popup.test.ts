import { describe, it, expect } from "bun:test";
import { pickActive, PopupSchema, type Popup } from "./popup";

// Minimal embed popup fixture — only the fields pickActive cares about
// (startsAt/endsAt/priority) need real values; PopupSchema fills the rest.
function makePopup(overrides: Partial<Popup> & { id: string }): Popup {
  return PopupSchema.parse({
    type: "embed",
    html: "<div />",
    ...overrides,
  }) as Popup;
}

const NOW = new Date("2026-06-15T12:00:00Z");

describe("pickActive — time window", () => {
  it("returns null when no popups are given", () => {
    expect(pickActive([], NOW)).toBeNull();
  });

  it("returns null when the only popup's window hasn't started yet", () => {
    const p = makePopup({ id: "future", startsAt: "2026-06-16T00:00:00Z" });
    expect(pickActive([p], NOW)).toBeNull();
  });

  it("returns null when the only popup's window has already ended", () => {
    const p = makePopup({ id: "expired", endsAt: "2026-06-14T00:00:00Z" });
    expect(pickActive([p], NOW)).toBeNull();
  });

  it("includes a popup exactly AT its startsAt boundary (inclusive)", () => {
    const p = makePopup({ id: "starts-now", startsAt: NOW.toISOString() });
    expect(pickActive([p], NOW)?.id).toBe("starts-now");
  });

  it("includes a popup exactly AT its endsAt boundary (inclusive)", () => {
    const p = makePopup({ id: "ends-now", endsAt: NOW.toISOString() });
    expect(pickActive([p], NOW)?.id).toBe("ends-now");
  });

  it("includes a popup with no startsAt/endsAt bounds (always in window)", () => {
    const p = makePopup({ id: "unbounded" });
    expect(pickActive([p], NOW)?.id).toBe("unbounded");
  });
});

describe("pickActive — priority", () => {
  it("returns the highest-priority popup among multiple active ones", () => {
    const low = makePopup({ id: "low", priority: 1 });
    const high = makePopup({ id: "high", priority: 10 });
    const mid = makePopup({ id: "mid", priority: 5 });
    expect(pickActive([low, high, mid], NOW)?.id).toBe("high");
  });

  it("ignores an out-of-window popup even if its priority is highest", () => {
    const expiredHighPriority = makePopup({
      id: "expired-high",
      priority: 100,
      endsAt: "2026-06-01T00:00:00Z",
    });
    const activeLow = makePopup({ id: "active-low", priority: 1 });
    expect(pickActive([expiredHighPriority, activeLow], NOW)?.id).toBe(
      "active-low",
    );
  });
});
