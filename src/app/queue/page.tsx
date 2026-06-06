import { QueueWidget } from "@/components/QueueWidget";
import { getStoreConfig } from "@/lib/store-config";

// Standalone, un-localized technician-queue board for a TV/monitor. Display-only.
// The minimal noindex shell comes from layout.tsx.
export default async function QueuePage() {
  const { site } = await getStoreConfig();
  return <QueueWidget storeId={site.storeId} widgetHost={site.widgetHost} />;
}
