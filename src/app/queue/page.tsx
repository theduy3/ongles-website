import { QueueWidget } from "@/components/QueueWidget";
import { site } from "@/lib/site";

// Standalone, un-localized technician-queue board for a TV/monitor. Display-only.
// The minimal noindex shell comes from layout.tsx.
export default function QueuePage() {
  return <QueueWidget storeId={site.storeId} />;
}
