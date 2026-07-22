import { TopEmployeeWidget } from "@/components/TopEmployeeWidget";
import { getStoreConfig } from "@/lib/store-config";

// Standalone, un-localized employee-of-the-month board for a TV/monitor.
// The minimal noindex shell comes from layout.tsx.
export default async function TopEmployeePage() {
  const { site } = await getStoreConfig();
  return (
    <TopEmployeeWidget
      storeId={site.storeId}
      widgetHost={site.widgetHost}
    />
  );
}
