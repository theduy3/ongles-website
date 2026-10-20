// Per-tenant apple-touch-icon, rendered at request time (see app/icon.tsx).
import { tenantIconImage } from "@/lib/tenant-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default function AppleIcon() {
  return tenantIconImage(180);
}
