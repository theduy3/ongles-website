import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { defaultLocale } from "@/lib/i18n";

// PWA / install manifest. Colours match the LIVE rendered theme in globals.css
// (grayscale palette: page bg #ffffff, header/footer #141414).
// start_url uses the default locale.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: "Ongles Maily",
    description:
      "Ongles Maily — salon d'ongles au Carrefour Beauport, Québec. Pose d'ongles, manucure et pédicure.",
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
