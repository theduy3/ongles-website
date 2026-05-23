"use client";

import { WidgetEmbed } from "@/components/WidgetEmbed";

// TODO(owner): update to the Ongles Maily check-in widget endpoint when available.
const WIDGET_SRC = "";
const STORE = "onglesmaily";

// Embeds the check-in widget on the un-localized /checkin kiosk page.
// Injection, loading and error/retry handling live in WidgetEmbed.
export function CheckinWidget() {
  return (
    <WidgetEmbed src={WIDGET_SRC} store={STORE} fallbackLabel="check-in" />
  );
}
