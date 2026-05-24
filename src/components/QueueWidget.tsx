"use client";

import { WidgetEmbed } from "@/components/WidgetEmbed";

const WIDGET_SRC =
  "https://app.onglesmaily.com/widgets/technician-queue-widget.js";
const STORE = "OM";

// Embeds the technician-queue widget on the un-localized /queue kiosk
// page. Injection, loading and error/retry handling live in WidgetEmbed.
export function QueueWidget() {
  return <WidgetEmbed src={WIDGET_SRC} store={STORE} fallbackLabel="queue" />;
}
