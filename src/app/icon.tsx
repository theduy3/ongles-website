// Per-tenant favicon, rendered at request time. Google requires a square
// multiple of 48px for SERP favicons (the old 40x40 PNG was ineligible and
// shared across all tenants).
import { tenantIconImage } from "@/lib/tenant-icon";

export const size = { width: 48, height: 48 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default function Icon() {
  return tenantIconImage(48);
}
