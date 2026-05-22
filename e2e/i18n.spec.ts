import { test, expect } from "@playwright/test";

// The proxy reads the device's Accept-Language (Playwright's context `locale`
// sets it) and redirects "/" to the matching locale, falling back to French.
test.describe("device language detection", () => {
  test.describe("English device", () => {
    test.use({ locale: "en-US" });
    test("/ → /en", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL(/\/en$/);
    });
  });

  test.describe("French device", () => {
    test.use({ locale: "fr-CA" });
    test("/ → /fr", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL(/\/fr$/);
    });
  });

  test.describe("Unsupported device language", () => {
    test.use({ locale: "de-DE" });
    test("/ → /fr (fallback to default)", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL(/\/fr$/);
    });
  });
});

// A saved NEXT_LOCALE cookie (manual toggle) wins over device language.
test.describe("cookie overrides device language", () => {
  test.use({ locale: "fr-CA" });
  test("NEXT_LOCALE=en sends a French device to /en", async ({ page, context }) => {
    await context.addCookies([
      { name: "NEXT_LOCALE", value: "en", url: "http://localhost:3100" },
    ]);
    await page.goto("/");
    await expect(page).toHaveURL(/\/en$/);
  });
});
