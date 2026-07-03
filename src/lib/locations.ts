// Location registry + map/booking helpers. The location DATA now lives in
// per-tenant config (src/config/tenants/<id>/location.ts) and is re-exported here
// under the stable "@/lib/locations" import path. The Location/DayHours TYPES live
// in src/config/types.ts; the helper functions below stay here (logic, not data).

import { site, locations } from "@/config";
import type { DayHours, Location, TenantSite } from "@/config/types";

export type { DayHours, Location };
export { locations };

/** Per-location Booker service-menu URL — the location's "Book Now" target. */
export function bookerServiceMenu(_loc: Location, s: TenantSite = site): string {
  return s.booker.brand;
}

/** Google Maps embed src (no API key needed) for any address query string. */
export function mapEmbedSrc(query: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

/** Google Maps "open in Maps" search link for any query string. */
function mapSearchLink(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Google Maps embed src for a Maily location's full address. */
export function mapEmbedUrl(loc: Location): string {
  return mapEmbedSrc(`${loc.address.street}, ${loc.address.line2}`);
}

/** Google Maps "open in Maps" link for the location pin. */
export function mapLink(loc: Location, s: TenantSite = site): string {
  return mapSearchLink(
    `${s.name} ${loc.name}, ${loc.address.street}, ${loc.address.line2}`,
  );
}

