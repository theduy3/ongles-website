import { SubscriptionWidget } from "@/components/SubscriptionWidget";
import { getStoreConfig } from "@/lib/store-config";

// Standalone, un-localized subscription page. The minimal noindex shell comes
// from layout.tsx; the SalonX subscribe widget renders here, keyed to the
// runtime tenant's storeId.
export default async function SubscriptionPage() {
  const { site } = await getStoreConfig();
  return (
    <SubscriptionWidget storeId={site.storeId} widgetHost={site.widgetHost} />
  );
}
