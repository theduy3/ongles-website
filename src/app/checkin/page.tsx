import { CheckinWidget } from "@/components/CheckinWidget";
import { getStoreConfig } from "@/lib/store-config";

// Standalone, un-localized check-in kiosk. The minimal noindex shell comes from
// layout.tsx; the SalonX check-in widget renders full-screen here.
export default async function CheckinPage() {
  const { site } = await getStoreConfig();
  return <CheckinWidget storeId={site.storeId} />;
}
