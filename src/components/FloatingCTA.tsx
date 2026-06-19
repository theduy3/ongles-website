import { getStoreConfig } from "@/lib/store-config";
import type { Dictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";
import { FloatingCTAButtons } from "./FloatingCTAButtons";

// Fixed bottom-right quick actions: a "Book Online" pill (→ the on-page booking
// wizard at /book-online) and a circular phone button (→ primary location).
// Stays async Server Component to resolve getStoreConfig(); interactivity is
// handled by the thin FloatingCTAButtons client island (Pitfall 3 split).
export async function FloatingCTA({
  dict,
  locale,
}: {
  dict: Pick<Dictionary, "cta">;
  locale: Locale;
}) {
  const { site, locations } = await getStoreConfig();
  // Use the primary location name for the GA4 salon_location param.
  const salonLocation = locations[0]?.name ?? site.name;
  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      <FloatingCTAButtons
        bookHref={`/${locale}/book-online`}
        phoneHref={site.contact.phoneHref}
        bookLabel={dict.cta.book}
        callLabel={dict.cta.callNow}
        salonLocation={salonLocation}
      />
    </div>
  );
}
