"use client";

import { WidgetEmbed } from "@/components/WidgetEmbed";

// TODO(owner): update to the Pure Nail Bar queue widget endpoint when available.
const WIDGET_SRC = "";
const STORE = "purenailbar";

// Embeds the technician-queue widget on the un-localized /queue kiosk
// page. Injection, loading and error/retry handling live in WidgetEmbed.
export function QueueWidget() {
  return <WidgetEmbed src={WIDGET_SRC} store={STORE} fallbackLabel="queue" />;
}
