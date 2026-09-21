import type { MetadataRoute } from "next";
import { getStoreConfig } from "@/lib/store-config";
import { defaultLocale } from "@/lib/i18n";
export const dynamic = "force-dynamic";


// PWA / install manifest. Colours match the LIVE rendered theme in globals.css
// (grayscale palette: page bg #ffffff, header/footer #141414).
// start_url uses the default locale.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { site } = await getStoreConfig();
  return {
    name: site.name,
    short_name: site.name,
    description:
      `${site.name} — salon d'ongles situé à ${site.contact.landmark}, ${site.contact.address.city}. Pose d'ongles, manucure et pédicure.`,
    start_url: `/${defaultLocale}`,
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2c2824",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
