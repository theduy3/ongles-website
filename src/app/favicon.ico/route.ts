// /favicon.ico — the URL crawlers fetch unconditionally. No file existed here,
// so the request 404'd and Google kept serving its last cached icon (the legacy
// template "S"). Serving PNG bytes at the .ico URL is valid; the tenant mark
// replaces the stale cache on next recrawl.
import { tenantIconImage } from "@/lib/tenant-icon";

export const dynamic = "force-dynamic";

export function GET() {
  return tenantIconImage(48);
}
