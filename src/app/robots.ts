import type { MetadataRoute } from "next";
import { getStoreConfig } from "@/lib/store-config";

// Allow all crawlers; point them at the sitemap. host disambiguates the
// preferred origin. The API route is excluded from indexing.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const { site } = await getStoreConfig();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
