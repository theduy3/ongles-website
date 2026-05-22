import { test, expect } from "@playwright/test";

const reviewsPageByLocale: Record<string, { heading: RegExp; score: RegExp }> =
  {
    fr: { heading: /^avis$/i, score: /4,9/ },
    en: { heading: /^reviews$/i, score: /4\.9/ },
  };
for (const [code, r] of Object.entries(reviewsPageByLocale)) {
  test(`reviews page renders aggregate (${code})`, async ({ page }) => {
    await page.goto(`/${code}/reviews`);
    await expect(
      page.getByRole("heading", { name: r.heading }).first(),
    ).toBeVisible();
    await expect(page.getByText(r.score).first()).toBeVisible();
    // No verified reviews yet → no testimonial cards.
    expect(await page.locator("figure blockquote").count()).toBe(0);
  });
}

const faqByLocale: Record<string, { heading: RegExp; firstQ: RegExp }> = {
  fr: { heading: /foire aux questions/i, firstQ: /où se trouve/i },
  en: { heading: /frequently asked questions/i, firstQ: /where is/i },
};
for (const [code, f] of Object.entries(faqByLocale)) {
  test(`faq page renders (${code})`, async ({ page }) => {
    await page.goto(`/${code}/faq`);
    await expect(
      page.getByRole("heading", { name: f.heading }).first(),
    ).toBeVisible();
    await expect(page.getByText(f.firstQ).first()).toBeVisible();
    expect(await page.locator("details").count()).toBeGreaterThan(0);
  });
}

// Homepage section headings, localized. The social block was replaced by the
// "Our Work" gallery slideshow, whose heading is bilingual.
const sectionsByLocale: Record<string, RegExp[]> = {
  fr: [
    /nos services/i,
    /pourquoi nous choisir/i,
    /nos réalisations/i,
    /nous contacter/i,
  ],
  en: [/our services/i, /why choose us/i, /our work/i, /contact us/i],
};

for (const [code, sections] of Object.entries(sectionsByLocale)) {
  test.describe(`homepage content renders (${code})`, () => {
    test("all sections are visible with JS (scroll reveal)", async ({
      page,
    }) => {
      await page.goto(`/${code}`);
      for (const name of sections) {
        await expect(page.getByRole("heading", { name }).first()).toBeVisible();
      }
    });
  });
}

// Reviews band: eyebrow + score render, and the "book online" CTA routes to the
// appointments page (where the booking widget lives).
const reviewsByLocale: Record<
  string,
  { eyebrow: RegExp; score: RegExp; book: string }
> = {
  fr: {
    eyebrow: /nos avis/i,
    score: /4,9\s*\/\s*5/,
    book: "Réservez en ligne",
  },
  en: { eyebrow: /our reviews/i, score: /4\.9\s*\/\s*5/, book: "Book online" },
};

for (const [code, r] of Object.entries(reviewsByLocale)) {
  test.describe(`homepage reviews section (${code})`, () => {
    test("shows rating and books to appointments", async ({ page }) => {
      await page.goto(`/${code}`);
      await expect(page.getByText(r.eyebrow).first()).toBeVisible();
      await expect(page.getByText(r.score).first()).toBeVisible();
      await expect(
        page.getByRole("link", { name: r.book, exact: true }),
      ).toHaveAttribute("href", `/${code}/appointments`);
    });
  });
}

// Regression guard for the Reveal SSR bug: with JS disabled, framer-motion never
// mounts. Content MUST still render — never stranded at opacity:0.
test.describe("without JavaScript (/fr)", () => {
  test.use({ javaScriptEnabled: false });

  test("all sections remain visible", async ({ page }) => {
    await page.goto("/fr");
    for (const name of sectionsByLocale.fr) {
      await expect(page.getByRole("heading", { name }).first()).toBeVisible();
    }
  });
});

// Gallery page: heading renders + every img in main has a non-empty alt.
const galleryByLocale: Record<string, RegExp> = {
  fr: /galerie/i,
  en: /gallery/i,
};
for (const [code, heading] of Object.entries(galleryByLocale)) {
  test(`gallery page renders with alt text (${code})`, async ({ page }) => {
    await page.goto(`/${code}/gallery`);
    await expect(
      page.getByRole("heading", { name: heading }).first(),
    ).toBeVisible();
    const imgs = await page.locator("main img").all();
    expect(imgs.length).toBeGreaterThan(0);
    for (const img of imgs) {
      const alt = await img.getAttribute("alt");
      expect(alt).toBeTruthy();
    }
  });
}
