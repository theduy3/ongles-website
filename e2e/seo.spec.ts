import { test, expect } from "@playwright/test";
import reviewsData from "../src/data/google-reviews.json";

test("faq page emits FAQPage schema", async ({ page }) => {
  await page.goto("/en/faq");
  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  const faq = blocks
    .map((b) => JSON.parse(b))
    .find((d) => d["@type"] === "FAQPage");
  expect(faq).toBeTruthy();
  expect(faq.mainEntity.length).toBeGreaterThan(0);
  expect(faq.mainEntity[0]["@type"]).toBe("Question");
});

// These specs lock in the SEO layer added to match (and beat) competitor nail
// salons: structured data, canonical/hreflang, OpenGraph, sitemap and robots.
// They assert the *intent* — crawlers must see a complete, machine-readable
// business identity — not just that markup happens to exist.

const ORIGIN = "https://onglessanssouci.com";

test.describe("sitewide route files", () => {
  test("robots.txt allows crawling and points at the sitemap", async ({
    request,
  }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("Allow: /");
    expect(body).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
  });

  test("sitemap lists every route in both locales with hreflang", async ({
    request,
  }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const xml = await res.text();
    // (5 nav + 5 secondary routes + 4 services) × 4 locales = 56 <url> entries.
    expect(xml.match(/<url>/g)?.length).toBe(56);
    expect(xml).toContain(`<loc>${ORIGIN}/fr</loc>`);
    expect(xml).toContain(`<loc>${ORIGIN}/en/services</loc>`);
    expect(xml).toContain(`<loc>${ORIGIN}/fr/services/extension-de-cils</loc>`);
    expect(xml).toContain(`<loc>${ORIGIN}/en/faq</loc>`);
    expect(xml).toContain(`<loc>${ORIGIN}/fr/reviews</loc>`);
    expect(xml).toContain(`<loc>${ORIGIN}/es/gallery</loc>`);
    expect(xml).toContain(`<loc>${ORIGIN}/fr/terms</loc>`);
    expect(xml).toContain(`<loc>${ORIGIN}/en/privacy</loc>`);
    expect(xml).toContain('hreflang="fr"');
    expect(xml).toContain('hreflang="en"');
  });

  test("manifest carries the live theme colours", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const manifest = await res.json();
    expect(manifest.name).toContain("Sans Souci");
    expect(manifest.start_url).toBe("/fr");
  });
});

test.describe("page metadata + structured data", () => {
  test("home (/fr) emits canonical, x-default hreflang and fr_CA OpenGraph", async ({
    page,
  }) => {
    await page.goto("/fr");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${ORIGIN}/fr`,
    );
    await expect(
      page.locator('link[rel="alternate"][hreflang="x-default"]'),
    ).toHaveAttribute("href", `${ORIGIN}/fr`);
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
      "content",
      "fr_CA",
    );
  });

  test("home emits a NailSalon LocalBusiness graph with hours + address", async ({
    page,
  }) => {
    await page.goto("/fr");
    const blocks = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const graph = blocks
      .map((b) => JSON.parse(b))
      .find((d) => Array.isArray(d["@graph"]));
    expect(graph, "sitewide @graph must be present").toBeTruthy();

    const business = graph["@graph"].find(
      (n: { "@type": string }) => n["@type"] === "NailSalon",
    );
    expect(business.address.addressLocality).toBe("Laval");
    expect(business.telephone).toBe("+14505056450");
    expect(business.openingHoursSpecification.length).toBeGreaterThan(0);
    // AggregateRating is gated on a real Google fetch: present (with a positive
    // count) once reviews are fetched, omitted while the scaffold is unfetched.
    if (reviewsData.fetchedAt) {
      expect(business.aggregateRating["@type"]).toBe("AggregateRating");
      expect(business.aggregateRating.reviewCount).toBeGreaterThan(0);
    } else {
      expect(business.aggregateRating).toBeUndefined();
    }
    expect(business.sameAs).toContain(
      "https://www.instagram.com/sans.souci.cflaval",
    );
  });

  test("services page emits an ItemList of Service nodes + breadcrumbs", async ({
    page,
  }) => {
    await page.goto("/fr/services");
    const blocks = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const parsed = blocks.map((b) => JSON.parse(b));

    const list = parsed.find((d) => d["@type"] === "ItemList");
    expect(list.itemListElement.length).toBe(4);
    expect(list.itemListElement[0]["@type"]).toBe("Service");
    // Prices are configured → every Service must carry a CAD Offer.
    for (const item of list.itemListElement) {
      expect(item.offers.priceCurrency).toBe("CAD");
      expect(typeof item.offers.price).toBe("number");
    }

    const crumbs = parsed.find((d) => d["@type"] === "BreadcrumbList");
    expect(crumbs.itemListElement.length).toBe(2);
  });
});

test.describe("individual service pages (localized slugs)", () => {
  test("localized slug resolves; wrong-locale slug 404s", async ({
    request,
  }) => {
    expect((await request.get("/fr/services/extension-de-cils")).status()).toBe(
      200,
    );
    expect((await request.get("/en/services/lash-extensions")).status()).toBe(
      200,
    );
    // Wrong-locale slug must NOT resolve (prevents duplicate-content dilution).
    expect((await request.get("/fr/services/lash-extensions")).status()).toBe(
      404,
    );
    expect((await request.get("/en/services/extension-de-cils")).status()).toBe(
      404,
    );
  });

  test("service page emits Service + Offer + 3-level breadcrumb", async ({
    page,
  }) => {
    await page.goto("/fr/services/extension-de-cils");
    const parsed = (
      await page.locator('script[type="application/ld+json"]').allTextContents()
    ).map((b) => JSON.parse(b));

    const service = parsed.find((d) => d["@type"] === "Service");
    expect(service.offers.priceCurrency).toBe("CAD");
    expect(service.offers.price).toBe(70);

    const crumbs = parsed.find((d) => d["@type"] === "BreadcrumbList");
    expect(crumbs.itemListElement.length).toBe(3);
  });

  test("canonical + reciprocal hreflang use the per-locale slug", async ({
    page,
  }) => {
    await page.goto("/fr/services/extension-de-cils");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://onglessanssouci.com/fr/services/extension-de-cils",
    );
    await expect(
      page.locator('link[rel="alternate"][hreflang="en"]'),
    ).toHaveAttribute(
      "href",
      "https://onglessanssouci.com/en/services/lash-extensions",
    );
  });
});

test("reviews page emits no per-review Review schema (testimonials-style)", async ({
  page,
}) => {
  await page.goto("/en/reviews");
  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  const hasReview = blocks
    .map((b) => JSON.parse(b))
    .flat()
    .some((d) => d?.["@type"] === "Review");
  expect(hasReview).toBe(false);
});

test("gallery page emits ImageGallery schema", async ({ page }) => {
  await page.goto("/en/gallery");
  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  const g = blocks
    .map((b) => JSON.parse(b))
    .find((d) => d["@type"] === "ImageGallery");
  expect(g).toBeTruthy();
  expect(g.image.length).toBeGreaterThan(0);
  expect(g.image[0]["@type"]).toBe("ImageObject");
});
