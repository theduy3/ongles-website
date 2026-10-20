import { NextResponse } from "next/server";
import { getStoreConfig } from "@/lib/store-config";
import { standaloneWebAppManifest } from "@/lib/standalone-manifest";

export const dynamic = "force-dynamic";

// Manifest for one standalone kiosk page. Linked from that page's metadata so
// iOS launches the saved URL instead of the marketing home start_url.
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ start: string }> },
) {
  const { start } = await ctx.params;
  const { site } = await getStoreConfig();
  const manifest = standaloneWebAppManifest(`/${start}`, site.name);
  if (!manifest) return new NextResponse(null, { status: 404 });
  return new NextResponse(JSON.stringify(manifest), {
    headers: {
      "content-type": "application/manifest+json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
