"use client";

import { WidgetEmbed } from "@/components/WidgetEmbed";

// Embeds the technician-queue widget on the un-localized /queue kiosk
// page. Injection, loading and error/retry handling live in WidgetEmbed.
export function QueueWidget({
  storeId = "OM",
  widgetHost = "https://app.onglesmaily.com",
}: {
  storeId?: string;
  widgetHost?: string;
}) {
  return (
    <WidgetEmbed
      src={`${widgetHost}/widgets/technician-queue-widget.js`}
      store={storeId}
      fallbackLabel="queue"
    />
  );
}
