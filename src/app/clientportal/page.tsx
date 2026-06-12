import { ClientPortalWidget } from "@/components/ClientPortalWidget";
import { getStoreConfig } from "@/lib/store-config";

// Standalone, un-localized client-account portal. The minimal noindex shell
// comes from layout.tsx; the SalonX client-account widget renders here, keyed
// to the runtime tenant's storeId.
export default async function ClientPortalPage() {
  const { site } = await getStoreConfig();
  return (
    <ClientPortalWidget storeId={site.storeId} widgetHost={site.widgetHost} />
  );
}
