"use client";

import { WidgetEmbed } from "@/components/WidgetEmbed";

const WIDGET_SRC = "https://app.onglesmaily.com/widgets/checkin-widget.js";

// Embeds the check-in widget on the un-localized /checkin kiosk page.
// Injection, loading and error/retry handling live in WidgetEmbed.
export function CheckinWidget({ storeId = "OM" }: { storeId?: string }) {
  return (
    <WidgetEmbed src={WIDGET_SRC} store={storeId} fallbackLabel="check-in" />
  );
}
