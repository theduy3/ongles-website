// Single source of truth for the un-localized "standalone" page routes — kiosk and
// customer-portal surfaces that live as siblings of [lang], each owning its own <html>
// root layout, and which must NOT receive a /{locale} prefix from the proxy.
//
// The proxy (src/proxy.ts) imports this Set; standalone-routes.test.ts scans the app/ tree
// and asserts every standalone-layout route is registered here, so a new kiosk route can no
// longer 404 for want of a hand-added entry. That bug shipped twice — /clientportal (PR #9)
// and /subscription (PR #10) — because the page files were added without touching the
// allowlist, and nothing failed until someone loaded the page.

export const STANDALONE_PATHS = new Set([
  "/checkin",
  "/queue",
  "/clientportal",
  "/subscription",
  "/leaderboard",
]);
