"use client";

import { WidgetEmbed } from "@/components/WidgetEmbed";

// Embeds the employee-of-the-month widget on the un-localized /leaderboard
// TV page. The widget reads its tenant from the custom data-eom-store
// attribute, so the shared injector receives that attribute name explicitly.
export function LeaderboardWidget({
  storeId = "OM",
  widgetHost = "https://app.onglesmaily.com",
}: {
  storeId?: string;
  widgetHost?: string;
}) {
  return (
    <WidgetEmbed
      src={`${widgetHost}/widgets/eom-widget.js`}
      store={storeId}
      storeAttr="data-eom-store"
      fallbackLabel="leaderboard"
    />
  );
}
