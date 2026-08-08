import { test, expect, type Locator } from "@playwright/test";

async function boundingBoxOf(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

test.describe("floating CTA responsive behavior", () => {
  test("shows a compact tenant-aware mobile dock", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en");

    const dock = page.getByTestId("floating-cta-mobile");
    const call = dock.getByRole("link", { name: "Call Now" });
    const book = dock.getByRole("link", { name: "Book Now" });
    const directions = dock.getByRole("link", { name: "Directions" });

    await expect(dock).toBeVisible();
    await expect(dock.getByRole("link")).toHaveText([
      "Call Now",
      "Book Now",
      "Directions",
    ]);
    await expect(call).toHaveAttribute("href", "tel:+14186608228");
    await expect(book).toHaveAttribute("href", "/en/book-online");

    const directionsHref = await directions.getAttribute("href");
    expect(directionsHref).toMatch(
      /google\.com\/maps\/dir\/\?api=1&destination=/,
    );
    expect(decodeURIComponent(directionsHref ?? "")).toContain("Ongles Maily");

    const [dockBox, callBox, bookBox, directionsBox] = await Promise.all([
      boundingBoxOf(dock),
      boundingBoxOf(call),
      boundingBoxOf(book),
      boundingBoxOf(directions),
    ]);
    const dockStyles = await dock.evaluate((element) => {
      const styles = window.getComputedStyle(element);
      return {
        position: styles.position,
        display: styles.display,
        minHeight: styles.minHeight,
        columnCount: styles.gridTemplateColumns.split(" ").length,
      };
    });

    expect(dockStyles).toEqual({
      position: "fixed",
      display: "grid",
      minHeight: "74px",
      columnCount: 3,
    });
    expect(Math.abs(dockBox.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(dockBox.x + dockBox.width - 390)).toBeLessThanOrEqual(1);
    expect(dockBox.height).toBeGreaterThanOrEqual(74);
    expect(dockBox.height).toBeLessThanOrEqual(76);

    for (const sideActionBox of [callBox, directionsBox]) {
      expect(sideActionBox.width).toBeGreaterThanOrEqual(44);
      expect(sideActionBox.height).toBeGreaterThanOrEqual(74);
    }
    expect(bookBox.width).toBeGreaterThanOrEqual(59);
    expect(bookBox.width).toBeLessThanOrEqual(61);
    expect(bookBox.height).toBeGreaterThanOrEqual(59);
    expect(bookBox.height).toBeLessThanOrEqual(61);
    expect(
      Math.abs(
        bookBox.x + bookBox.width / 2 - (dockBox.x + dockBox.width / 2),
      ),
    ).toBeLessThanOrEqual(1);
    expect(dockBox.y - bookBox.y).toBeGreaterThanOrEqual(15);
    expect(dockBox.y - bookBox.y).toBeLessThanOrEqual(17);

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
    await expect(privacy).toBeVisible();

    const [privacyBox, dockBox, bookBox] = await Promise.all([
      boundingBoxOf(privacy),
      boundingBoxOf(page.getByTestId("floating-cta-mobile")),
      boundingBoxOf(
        page
          .getByTestId("floating-cta-mobile")
          .getByRole("link", { name: "Book Now" }),
      ),
    ]);
    const privacyBottom = privacyBox.y + privacyBox.height;
    const raisedDockTop = Math.min(dockBox.y, bookBox.y);

    expect(privacyBottom).toBeLessThanOrEqual(raisedDockTop);
  });
});
