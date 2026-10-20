import type { MetadataRoute } from "next";
import { STANDALONE_PATHS } from "@/lib/standalone-routes";

// iOS Add to Home Screen launches the linked manifest's start_url, not the page
// the user saved. The root manifest's start_url is the localized home page, so
// a saved /checkin icon opened Home. Each standalone kiosk gets its own
// manifest whose start_url is that page.
const SHORT_NAMES: Record<string, string> = {
  "/checkin": "Check in",
  "/queue": "Queue",
  "/clientportal": "Portal",
  "/subscription": "Subscription",
  "/leaderboard": "Leaderboard",
};

export function standaloneManifestHref(pathname: string): string {
  return `/standalone-manifest/${pathname.replace(/^\//, "")}`;
}

export function standaloneWebAppManifest(
  pathname: string,
  siteName: string,
): MetadataRoute.Manifest | null {
  if (!STANDALONE_PATHS.has(pathname)) return null;
  const shortName = SHORT_NAMES[pathname] ?? siteName;
  return {
    id: pathname,
    name: `${siteName} — ${shortName}`,
    short_name: shortName,
    start_url: pathname,
    scope: pathname,
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2c2824",
    icons: [
      { src: "/pwa-icon", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
