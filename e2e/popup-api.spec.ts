import { test, expect } from "@playwright/test";

// The fixture schedule rolls over: "Spring Special" (promo-active) is live until
// 2026-05-31, then "subscribe-ss" takes over from 2026-06-01. These assertions
// stay correct across that handoff instead of hard-coding a date-specific record.
const SCHEDULED_IDS = ["promo-active", "subscribe-ss"];
const VALID_TYPES = ["rich", "embed"];

test.describe("/api/popups", () => {
  test("returns a scheduled active pop-up from the fixture", async ({ request }) => {
    const res = await request.get("/api/popups");
    expect(res.ok()).toBeTruthy();
    const { popup } = await res.json();
    expect(popup).not.toBeNull();
    // Only one of the two scheduled records is active at a time; expired/future/
    // low records are always excluded by pickActive.
    expect(SCHEDULED_IDS).toContain(popup.id);
  });

  test("response shape carries type + version", async ({ request }) => {
    const { popup } = await (await request.get("/api/popups")).json();
    expect(popup).not.toBeNull();
    expect(VALID_TYPES).toContain(popup.type);
    expect(typeof popup.version).toBe("number");
  });
});
