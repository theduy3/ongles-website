import { test, expect } from "@playwright/test";

// /api/popups serves pickActive() over the popup source. In e2e (no Supabase)
// it falls back to the bundled fixture src/data/popups.json, which holds two
// deliberately-inactive records — `expired` (ended year 2000) and `future`
// (starts year 2999) — so pickActive selects neither. These assertions pin that
// filtering: the endpoint is healthy and returns { popup: null }, never a
// stale/future record.
test.describe("/api/popups", () => {
  test("returns 200 with popup:null when no record is currently active", async ({ request }) => {
    const res = await request.get("/api/popups");
    expect(res.ok()).toBeTruthy();
    const { popup } = await res.json();
    // expired + future are both out of window today → pickActive returns null.
    expect(popup).toBeNull();
  });

  test("never selects an expired or not-yet-started record", async ({ request }) => {
    const { popup } = await (await request.get("/api/popups")).json();
    // Guard the pickActive window logic through the real endpoint: if it ever
    // returned one of the inactive fixture records, the window filter regressed.
    expect(popup?.id).not.toBe("expired");
    expect(popup?.id).not.toBe("future");
  });
});
