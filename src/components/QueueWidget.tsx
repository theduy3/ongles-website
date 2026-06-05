"use client";

import { WidgetEmbed } from "@/components/WidgetEmbed";

const WIDGET_SRC =
  "https://app.onglesmaily.com/widgets/technician-queue-widget.js";

// Embeds the technician-queue widget on the un-localized /queue kiosk
// page. Injection, loading and error/retry handling live in WidgetEmbed.
export function QueueWidget({ storeId = "OM" }: { storeId?: string }) {
  return <WidgetEmbed src={WIDGET_SRC} store={storeId} fallbackLabel="queue" />;
}
