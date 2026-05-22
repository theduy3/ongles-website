import { test, expect } from "@playwright/test";

const localeCases = [
  {
    code: "fr",
    book: "Réserver",
    pages: [
      { link: "Services", heading: /nos services/i, path: "/fr/services" },
      {
        link: "Pourquoi nous",
        heading: /pourquoi nous choisir/i,
        path: "/fr/about",
      },
      {
        link: "Rendez-vous",
        // Appointments page has no SSR <h1> (the widget injects its own heading
        // client-side); assert the always-rendered help paragraph instead.
        text: /vous avez de la difficulté/i,
        path: "/fr/appointments",
      },
      { link: "Contact", heading: /nous contacter/i, path: "/fr/contact" },
    ],
  },
  {
    code: "en",
    book: "Book now",
    pages: [
      { link: "Services", heading: /our services/i, path: "/en/services" },
      { link: "About", heading: /why choose us/i, path: "/en/about" },
      {
        link: "Appointments",
        // No SSR <h1> on the appointments page; assert the help paragraph.
        text: /trouble booking online/i,
        path: "/en/appointments",
      },
      { link: "Contact", heading: /contact us/i, path: "/en/contact" },
    ],
  },
];

// "/" redirect behavior is covered deterministically in i18n.spec.ts.

for (const loc of localeCases) {
  test.describe(`navigation (${loc.code})`, () => {
    test("homepage loads with branding", async ({ page }) => {
      await page.goto(`/${loc.code}`);
      await expect(page).toHaveTitle(/Sans Souci/i);
      await expect(
        page
          .locator("header")
          .getByRole("link", { name: "Sans Souci Ongles & Spa" }),
      ).toBeVisible();
    });

    for (const { link, heading, text, path } of loc.pages) {
      test(`header nav → ${link}`, async ({ page }) => {
        await page.goto(`/${loc.code}`);
        await page
          .locator("header")
          .getByRole("link", { name: link, exact: true })
          .click();
        await expect(page).toHaveURL(new RegExp(`${path}$`));
        if (heading) {
          await expect(
            page.getByRole("heading", { name: heading }).first(),
          ).toBeVisible();
        }
        if (text) {
          await expect(page.getByText(text).first()).toBeVisible();
        }
      });
    }

    test("Book now points to the appointments page (with the embedded widget)", async ({
      page,
    }) => {
      await page.goto(`/${loc.code}`);
      const book = page.locator("header").getByRole("link", { name: loc.book });
      await expect(book).toHaveAttribute("href", `/${loc.code}/appointments`);
    });
  });
}
