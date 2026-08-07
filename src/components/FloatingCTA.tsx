import { getStoreConfig } from "@/lib/store-config";
import type { Dictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";
import { mapDirectionsLink } from "@/lib/locations";
import { FloatingCTAButtons } from "./FloatingCTAButtons";

// Resolve tenant and locale-aware CTA destinations on the server; responsive
// positioning, route visibility, and analytics live in the client island.
export async function FloatingCTA({
  dict,
  locale,
}: {
  dict: Pick<Dictionary, "cta">;
  locale: Locale;
}) {
  const { site, locations } = await getStoreConfig();
  const bookingPath = "/" + locale + site.booking;
  const salonLocation = locations[0]?.name ?? site.name;

  return (
    <FloatingCTAButtons
      bookHref={bookingPath}
      phoneHref={site.contact.phoneHref}
      directionsHref={mapDirectionsLink(locations[0], site)}
      bookLabel={dict.cta.book}
      callLabel={dict.cta.callNow}
      mobileBookLabel={dict.cta.bookNowShort}
      mobileCallLabel={dict.cta.callNowShort}
      mobileDirectionsLabel={dict.cta.directionsShort}
      bookingPath={bookingPath}
      salonLocation={salonLocation}
    />
  );
}
