"use client";

import { WidgetEmbed } from "@/components/WidgetEmbed";

// Embeds the check-in widget on the un-localized /checkin kiosk page.
// Injection, loading and error/retry handling live in WidgetEmbed.
export function CheckinWidget({
  storeId = "OM",
  widgetHost = "https://app.onglesmaily.com",
}: {
  storeId?: string;
  widgetHost?: string;
}) {
  return (
    <WidgetEmbed
      src={`${widgetHost}/widgets/checkin-widget.js`}
      store={storeId}
      fallbackLabel="check-in"
    />
  );
}
