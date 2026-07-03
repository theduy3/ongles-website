import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

// E2E runs against a production build (next build && next start): stable and
// fast, with no on-demand dev compilation to race assertion timeouts. The
// contact form returns 503 in production (provider not configured by design),
// so the contact specs intercept /api/contact to exercise the form UX itself.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // In CI: github annotations + an html report (uploaded as an artifact by the
  // CI workflow so failures are inspectable). Locally: the concise list reporter.
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `bun run build && ./node_modules/.bin/next start --port ${PORT}`,
    url: baseURL,
    // Pin the tenant e2e runs against, explicitly. Previously unset → defaulted
    // to ongles-maily; making it explicit documents the intended fixture and
    // stops the suite silently re-targeting if the registry default changes.
    // NOTE (2026-07-02): most inherited specs still assert the ORIGINAL
    // SS-website clone's "Ongles Sans Souci" tenant, which does not exist in
    // this repo — they need retargeting to ongles-maily (tracked separately).
    env: { TENANT: process.env.TENANT ?? "ongles-maily" },
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
