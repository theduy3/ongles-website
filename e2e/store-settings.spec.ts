import { test, expect } from "@playwright/test";

// The admin store-settings surface lets the owner edit this container's store
// VALUES (NAP, hours, prices, SEO meta) and have them go live via a Supabase
// override deep-merged over static config at request time — no rebuild.
//
// Two layers are covered:
//  1. The auth gate (always runnable): the API must never serve or accept data
//     without an authenticated admin session.
//  2. The full live-edit flow (env-gated): proving an edit appears on the public
//     site without a rebuild needs real ADMIN_PASSWORD + Supabase credentials,
//     which CI does not provide — same constraint the contact-form spec notes for
//     the email provider. It is skipped unless those secrets are present, and the
//     manual steps are documented inline + in tasks/spec-admin-store-settings.md.

test.describe("/api/admin/settings — auth gate", () => {
  test("GET is rejected without an admin session", async ({ request }) => {
    const res = await request.get("/api/admin/settings");
    // Unauthenticated callers must not receive store data (401 from guard(), or a
    // middleware redirect). The only contract that matters: it does NOT succeed.
    expect(res.ok()).toBeFalsy();
  });

  test("PUT is rejected without an admin session", async ({ request }) => {
    const res = await request.put("/api/admin/settings", {
      data: { site: { name: "Unauthorized Edit" } },
    });
    expect(res.ok()).toBeFalsy();
  });
});

// Full round-trip: login → edit → save → public page reflects it without rebuild.
const hasAdminEnv =
  !!process.env.ADMIN_PASSWORD &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY;

test.describe("live store-settings edit (no rebuild)", () => {
  test.skip(
    !hasAdminEnv,
    "needs ADMIN_PASSWORD + Supabase service-role credentials",
  );

  test("editing a service price shows on the public site without a rebuild", async ({
    page,
    request,
  }) => {
    // 1. Authenticate the admin session.
    const login = await request.post("/api/admin/login", {
      data: { password: process.env.ADMIN_PASSWORD },
    });
    expect(login.ok()).toBeTruthy();

    // 2. Write a sparse override (a recognizable service price).
    const PRICE = 199;
    const put = await request.put("/api/admin/settings", {
      data: { services: [{ id: "pose-ongles", price: PRICE }] },
    });
    expect(put.ok()).toBeTruthy();

    // 3. The public services page must render the new price — no rebuild, just the
    //    revalidateTag('store-config:<tenant>') fired by the PUT.
    await page.goto("/en/services");
    await expect(page.getByText(new RegExp(`\\$?${PRICE}`))).toBeVisible();
  });
});
