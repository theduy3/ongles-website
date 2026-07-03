import { test, expect } from "@playwright/test";

// Retargeted to the ongles-maily tenant (this repo's default; the inherited
// SS-clone baseline is gone). maily aggregate rating is 3.9; it has no fetched
// Google review bodies, so both the homepage carousel and the /reviews page show
// the six locale-aware dict placeholders (Testimonials.tsx / reviews/page.tsx).

const reviewsPageByLocale: Record<string, { heading: RegExp; score: RegExp }> = {
  fr: { heading: /^avis$/i, score: /3,9/ },
  en: { heading: /^reviews$/i, score: /3\.9/ },
};
for (const [code, r] of Object.entries(reviewsPageByLocale)) {
  test(`reviews page renders aggregate + placeholder testimonials (${code})`, async ({ page }) => {
    await page.goto(`/${code}/reviews`);
    await expect(
      page.getByRole("heading", { name: r.heading }).first(),
    ).toBeVisible();
    await expect(page.getByText(r.score).first()).toBeVisible();
    // No fetched Google reviews yet → the page falls back to the 6 dict
    // placeholders, rendered as figure > blockquote cards.
    expect(await page.locator("figure blockquote").count()).toBe(6);
  });
}

const faqByLocale: Record<string, { heading: RegExp; firstQ: RegExp }> = {
  fr: { heading: /questions fréquentes/i, firstQ: /où se trouve/i },
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

// Homepage section headings, localized (maily dict.home.* / dict.reviews).
const sectionsByLocale: Record<string, RegExp[]> = {
  fr: [
    /De beaux ongles/i, // services
    /Galerie de nail art/i, // gallery
    /Ce que disent nos clientes/i, // testimonials
  ],
  en: [/Beautiful Nails/i, /Nail Art Gallery/i, /What Our Clients Say/i],
};

for (const [code, sections] of Object.entries(sectionsByLocale)) {
  test.describe(`homepage content renders (${code})`, () => {
    test("all sections are visible with JS (scroll reveal)", async ({ page }) => {
      await page.goto(`/${code}`);
      for (const name of sections) {
        await expect(page.getByRole("heading", { name }).first()).toBeVisible();
      }
    });
  });
}

// Reviews band: eyebrow + aggregate score render. The separate booking section's
// CTA routes to the booking page (/book-online).
const reviewsByLocale: Record<
  string,
  { eyebrow: RegExp; score: RegExp; book: RegExp }
> = {
  fr: {
    eyebrow: /L'amour de nos clientes/i,
    score: /3,9\s*\/\s*5/,
    book: /Réserver en ligne/i,
  },
  en: {
    eyebrow: /Client Love/i,
    score: /3\.9\s*\/\s*5/,
    book: /Book Online/i,
  },
};

for (const [code, r] of Object.entries(reviewsByLocale)) {
  test.describe(`homepage reviews band + booking CTA (${code})`, () => {
    test("shows rating and books to the booking page", async ({ page }) => {
      await page.goto(`/${code}`);
      await expect(page.getByText(r.eyebrow).first()).toBeVisible();
      await expect(page.getByText(r.score).first()).toBeVisible();
      await expect(
        page.getByRole("link", { name: r.book }).first(),
      ).toHaveAttribute("href", `/${code}/book-online`);
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
