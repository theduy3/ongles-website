import { test, expect } from "@playwright/test";

test.describe("floating CTA responsive behavior", () => {
  test("shows a compact tenant-aware mobile dock", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en");

    const dock = page.getByTestId("floating-cta-mobile");
    await expect(dock).toBeVisible();
    await expect(dock.getByRole("link", { name: "Call Now" })).toHaveAttribute(
      "href",
      "tel:+14186608228",
    );
    await expect(dock.getByRole("link", { name: "Book Now" })).toHaveAttribute(
      "href",
      "/en/book-online",
    );

    const directions = dock.getByRole("link", { name: "Directions" });
    const directionsHref = await directions.getAttribute("href");
    expect(directionsHref).toMatch(
      /google\.com\/maps\/dir\/\?api=1&destination=/,
    );
    expect(decodeURIComponent(directionsHref ?? "")).toContain("Ongles Maily");
    await expect(page.getByTestId("floating-cta-desktop")).toBeHidden();
  });

  test("hides the CTA on the booking route", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/book-online/");
    await expect(page.getByTestId("floating-cta-mobile")).toHaveCount(0);
    await expect(page.getByTestId("floating-cta-desktop")).toHaveCount(0);
  });

  test("keeps the existing desktop controls", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/en");
    const desktop = page.getByTestId("floating-cta-desktop");
    await expect(desktop).toBeVisible();
    await expect(
      desktop.getByRole("link", { name: "Book Online" }),
    ).toHaveAttribute("href", "/en/book-online");
    await expect(
      desktop.getByRole("link", { name: "Call to Book" }),
    ).toHaveAttribute("href", "tel:+14186608228");
    await expect(page.getByTestId("floating-cta-mobile")).toBeHidden();
  });

  test("keeps the footer clear of the mobile dock", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en");
    const privacy = page.getByRole("link", { name: "Privacy Policy" });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const box = await privacy.boundingBox();
    expect(box).not.toBeNull();
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThan(844 - 74);
  });
});
