import { test, expect } from "@playwright/test";

const rich = (over = {}) => ({
  popup: {
    id: "t", version: 1, type: "rich", priority: 1,
    startsAt: null, endsAt: null, frequency: "session",
    image: null,
    title: { en: "Hello promo", fr: "Bonjour promo" },
    body: { en: "Body en", fr: "Corps fr" },
    cta: { label: { en: "Book", fr: "Réserver" }, href: "/appointments" },
    ...over,
  },
});

test("rich pop-up shows in the active locale and dismisses", async ({ page }) => {
  await page.route("**/api/popups*", (r) => r.fulfill({ json: rich() }));
  await page.goto("/fr");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Bonjour promo")).toBeVisible();
  await page.getByRole("button", { name: /close/i }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("frequency cap suppresses on reload (session)", async ({ page }) => {
  await page.route("**/api/popups*", (r) => r.fulfill({ json: rich() }));
  await page.goto("/en");
  await page.getByRole("button", { name: /close/i }).click();
  await page.reload();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("embed renders in a sandboxed iframe", async ({ page }) => {
  await page.route("**/api/popups*", (r) =>
    r.fulfill({ json: { popup: { id: "e", version: 1, type: "embed", priority: 1, startsAt: null, endsAt: null, frequency: "always", html: "<p>widget-here</p>" } } }),
  );
  await page.goto("/fr");
  const frame = page.locator('iframe[title="promotion"]');
  await expect(frame).toBeVisible();
  await expect(frame).toHaveAttribute("sandbox", /allow-scripts/);
});

test("no pop-up when API returns null", async ({ page }) => {
  await page.route("**/api/popups*", (r) => r.fulfill({ json: { popup: null } }));
  await page.goto("/fr");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
