import { test, expect } from "@playwright/test";

// Retargeted to the ongles-maily tenant. maily's header nav is anchor-based for
// the on-homepage sections (Services → /fr#services, etc.) plus two real routes
// (Tarifs → /fr/tarifs, Comparatifs → /fr/comparaisons/…), and a "Réserver" CTA
// to the booking page. Brand + title are "Ongles Maily".

const localeCases = [
  {
    code: "fr",
    brand: "Ongles Maily",
    book: "Réserver",
    // Anchor nav items: label → href (the header link points at a section anchor).
    anchors: [
      { link: "Services", href: "/fr#services" },
      { link: "Galerie", href: "/fr#gallery" },
      { link: "Avis", href: "/fr#testimonials" },
    ],
  },
  {
    code: "en",
    brand: "Ongles Maily",
    book: "Book Now",
    anchors: [
      { link: "Services", href: "/en#services" },
      { link: "Gallery", href: "/en#gallery" },
      { link: "Reviews", href: "/en#testimonials" },
    ],
  },
];

// "/" redirect behavior is covered deterministically in i18n.spec.ts.

for (const loc of localeCases) {
  test.describe(`navigation (${loc.code})`, () => {
    test("homepage loads with branding", async ({ page }) => {
      await page.goto(`/${loc.code}`);
      await expect(page).toHaveTitle(/Ongles Maily/i);
      await expect(
        page.locator("header").getByRole("link", { name: loc.brand }).first(),
      ).toBeVisible();
    });

    for (const { link, href } of loc.anchors) {
      test(`header nav → ${link} (anchor)`, async ({ page }) => {
        await page.goto(`/${loc.code}`);
        await expect(
          page.locator("header").getByRole("link", { name: link, exact: true }),
        ).toHaveAttribute("href", href);
      });
    }

    // Pricing / Comparisons are icon-only links in maily's header (no accessible
    // text label), so they are not exercised as named nav items here; the
    // localized /tarifs ⇔ /pricing routing is covered in seo.spec + unit tests.

    test("Réserver / Book CTA points to the booking page", async ({ page }) => {
      await page.goto(`/${loc.code}`);
      const book = page
        .locator("header")
        .getByRole("link", { name: loc.book, exact: true });
      await expect(book).toHaveAttribute("href", `/${loc.code}/book-online`);
    });
  });
}
