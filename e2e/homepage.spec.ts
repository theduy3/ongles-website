import { test, expect } from "@playwright/test";

// Retargeted to the ongles-maily tenant. Phone is (418) 660-8228 →
// tel:+14186608228; the homepage testimonial carousel shows the 6 locale-aware
// dict placeholders (first author "Sarah M."); brand is "Ongles Maily".
test.describe("homepage enhancements (/fr)", () => {
  test("call-to-book links dial the configured number (tel:)", async ({ page }) => {
    await page.goto("/fr");
    const call = page.getByRole("link", { name: /Appeler pour réserver/i }).first();
    await expect(call).toHaveAttribute("href", "tel:+14186608228");
  });

  test("renders the 6 placeholder testimonial cards", async ({ page }) => {
    await page.goto("/fr");
    // No fetched Google reviews → the carousel falls back to dict placeholders.
    await expect(page.getByText(/Sarah M\./).first()).toBeVisible();
    // Scope to the testimonials carousel — the gallery is also a snap list.
    await expect(page.locator("#testimonials li.snap-start")).toHaveCount(6);
  });

  test("service section renders images", async ({ page }) => {
    await page.goto("/fr");
    const imgs = page.locator("#services img");
    expect(await imgs.count()).toBeGreaterThan(0);
    await expect(imgs.first()).toBeVisible();
  });

  test("header shows the logo with brand alt text", async ({ page }) => {
    await page.goto("/fr");
    await expect(
      page.locator("header").getByRole("img", { name: "Ongles Maily" }),
    ).toBeVisible();
  });

  test("Call-to-Book buttons dial the configured number (tel:), not #location", async ({ page }) => {
    await page.goto("/fr");
    const calls = page.getByRole("link", { name: "Appeler pour réserver" });
    const count = await calls.count();
    expect(count).toBeGreaterThanOrEqual(1);
    for (let i = 0; i < count; i++) {
      await expect(calls.nth(i)).toHaveAttribute("href", /^tel:\+?\d+$/);
    }
  });

  test("keeps the hero first and places the direct answer before services", async ({
    page,
  }) => {
    for (const path of ["/fr", "/en"]) {
      await page.goto(path);

      const main = page.locator("main");
      const heroH1 = main.getByRole("heading", {
        level: 1,
        name:
          path === "/fr"
            ? /Des soins d'ongles professionnels, faits pour Vous/i
            : /Professional Nail Care, Made for You/i,
      });
      const answerHeading = main.getByRole("heading", {
        level: 2,
        name: /Ongles Maily/i,
      });

      await expect(heroH1).toHaveCount(1);
      await expect(heroH1).toBeVisible();
      await expect(answerHeading).toHaveCount(1);
      await expect(answerHeading).toBeVisible();

      const answerCopy =
        path === "/fr"
          ? /outils désinfectés après chaque cliente/i
          : /tools disinfected after every client/i;
      await expect(main.getByText(answerCopy)).toBeVisible();

      const answerBeforeServices = await heroH1.evaluate((heroH1) => {
        const root = heroH1.closest("main");
        if (!root) return false;

        const overviewH2 = Array.from(root.querySelectorAll("h2")).find((node) =>
          /Ongles Maily/i.test(node.textContent ?? ""),
        );
        const overviewSection = overviewH2?.closest("section");
        const services = root.querySelector("#services");

        return Boolean(
          heroH1 &&
            overviewSection &&
            services &&
            (heroH1.compareDocumentPosition(overviewSection) &
              Node.DOCUMENT_POSITION_FOLLOWING) &&
            (overviewSection.compareDocumentPosition(services) &
              Node.DOCUMENT_POSITION_FOLLOWING),
        );
      });

      expect(answerBeforeServices).toBe(true);
    }
  });
});
