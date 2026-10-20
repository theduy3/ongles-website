// Per-tenant PWA icon for manifest.json. Static public/icon-*.png shipped the
// template's Pure Nail Bar "S" to every tenant; render at request time instead.
// One 512px "any" entry is enough for install prompts + home screen.
import { tenantIconImage } from "@/lib/tenant-icon";

export const dynamic = "force-dynamic";

export function GET() {
  return tenantIconImage(512);
}
