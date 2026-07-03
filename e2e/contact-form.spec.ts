import { test, expect, type Page } from "@playwright/test";

// Tests run against a production build where the email provider isn't configured
// (route returns 503 by design). Intercept the API so these specs verify the
// FORM's behaviour — validation and the success/locale UX — not the backend env.
// The route's 422/503/200 logic is covered separately.
async function stubContactApi(page: Page) {
  await page.route("**/api/contact", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { received: true } }),
    }),
  );
}

test.describe("contact form (/en)", () => {
  test("valid submission shows a confirmation", async ({ page }) => {
    await stubContactApi(page);
    await page.goto("/en/contact");

    // Scope to main — the footer newsletter also has an "Email" field.
    const form = page.locator("main");
    await form.getByLabel("First name").fill("Ada");
    await form.getByLabel("Last name").fill("Lovelace");
    await form.getByLabel("Email").fill("ada@example.com");
    await form.getByLabel("Message").fill("I'd love to book an appointment.");

    await form.getByRole("button", { name: /^send$/i }).click();

    await expect(page.getByText(/we've received your message/i)).toBeVisible();
  });

  test("empty submission is blocked by required-field validation", async ({
    page,
  }) => {
    await stubContactApi(page);
    await page.goto("/en/contact");

    await page.getByRole("button", { name: /^send$/i }).click();

    await expect(page.getByText(/we've received your message/i)).toHaveCount(0);
    const firstName = page.getByLabel("First name");
    const valid = await firstName.evaluate(
      (el: HTMLInputElement) => el.validity.valid,
    );
    expect(valid).toBe(false);
  });
});

test.describe("contact form (/fr)", () => {
  test("valid submission shows French confirmation", async ({ page }) => {
    await stubContactApi(page);
    await page.goto("/fr/contact");

    const form = page.locator("main");
    await form.getByLabel("Prénom").fill("Ada");
    await form.getByLabel("Nom de famille").fill("Lovelace");
    await form.getByLabel("Courriel").fill("ada@example.com");
    await form.getByLabel("Message").fill("J'aimerais prendre rendez-vous.");

    await form.getByRole("button", { name: /^envoyer$/i }).click();

    await expect(
      page.getByText(/nous avons bien reçu votre message/i),
    ).toBeVisible();
  });
});
