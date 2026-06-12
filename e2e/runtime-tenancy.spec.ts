import { test, expect } from "@playwright/test";

// Build-once tenancy proof at the e2e layer. The SAME build, served with a given
// TENANT, must render that tenant's hero — never another's. The webServer command
// (playwright.config.ts) inherits the shell env, so:
//
//   TENANT=ongles-charlesbourg bun run test:e2e -- runtime-tenancy
//
// builds+starts as Charlesbourg AND points this spec at the Charlesbourg expectation.
// With TENANT unset (default CI run) it asserts the maily baseline.
const HERO_BY_TENANT: Record<string, RegExp> = {
  "ongles-maily": /Carrefour Beauport/,
  "ongles-charlesbourg": /Carrefour Charlesbourg/,
  "ongles-rivieres": /Centre Les Rivières/,
};

test("active tenant renders its own hero", async ({ page }) => {
  const tenant = process.env.TENANT ?? "ongles-maily";
  const expected = HERO_BY_TENANT[tenant];
  expect(expected, `Unknown TENANT="${tenant}" in e2e expectations`).toBeDefined();

  await page.goto("/en");
  await expect(page.locator("body")).toContainText(expected);
});
