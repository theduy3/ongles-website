import { test, expect } from "@playwright/test";

// Verifies admin-authored custom code is injected on targeted public pages only,
// not on other pages, and not on the un-localized kiosk routes (/checkin, /queue).
//
// Gating mirrors e2e/store-settings.spec.ts: the full flow requires real
// ADMIN_PASSWORD + Supabase credentials, which CI does not provide. When those
// env vars are absent the suite skips cleanly rather than failing hard.

const hasAdminEnv =
  !!process.env.ADMIN_PASSWORD &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY;

test.describe("custom code injection (per-page)", () => {
  test.skip(
    !hasAdminEnv,
    "needs ADMIN_PASSWORD + Supabase service-role credentials",
  );

  test(
    "body-end snippet runs on target page, not elsewhere, not on kiosk",
    async ({ page, request }) => {
      // ── 1. Authenticate as admin ──────────────────────────────────────────
      const login = await request.post("/api/admin/login", {
        data: { password: process.env.ADMIN_PASSWORD },
      });
      expect(login.ok()).toBeTruthy();

      // ── 2. PUT a safe marker snippet scoped to the "home" page only ───────
      const put = await request.put("/api/admin/settings", {
        data: {
          customCode: [
            {
              id: "e2e",
              label: "e2e",
              code: "<script>window.__cc_test=1</script>",
              placement: "body-end",
              pages: ["home"],
              enabled: true,
            },
          ],
        },
      });
      expect(put.ok()).toBeTruthy();

      try {
        // ── 3. Target page: /en (home) — snippet must execute ─────────────
        await page.goto("/en");
        await expect
          .poll(
            () =>
              page.evaluate(
                () =>
                  (window as Window & { __cc_test?: number }).__cc_test,
              ),
            { timeout: 8_000 },
          )
          .toBe(1);

        // ── 4. Off-target page: /en/about — snippet must NOT execute ──────
        await page.goto("/en/about");
        expect(
          await page.evaluate(
            () => (window as Window & { __cc_test?: number }).__cc_test,
          ),
        ).toBeUndefined();

        // ── 5. Kiosk route: /checkin — no [lang] layout, no host element ──
        await page.goto("/checkin");
        expect(await page.locator("[data-custom-code-body]").count()).toBe(0);
      } finally {
        // ── 6. Teardown: remove the snippet so the test is idempotent ─────
        await request.put("/api/admin/settings", {
          data: { customCode: [] },
        });
      }
    },
  );
});
