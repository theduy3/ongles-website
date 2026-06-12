"use client";

import { WidgetEmbed } from "@/components/WidgetEmbed";

// Embeds the subscribe widget on the un-localized /subscription page. Injection,
// loading and error/retry handling live in WidgetEmbed. Like the client-account
// widget (and unlike the check-in/queue kiosks), this script keys off a custom
// attribute — `data-subscribe-store` — so we pass it through storeAttr.
export function SubscriptionWidget({
  storeId = "OM",
  widgetHost = "https://app.onglesmaily.com",
}: {
  storeId?: string;
  widgetHost?: string;
}) {
  return (
    <WidgetEmbed
      src={`${widgetHost}/widgets/subscribe-widget.js`}
      store={storeId}
      storeAttr="data-subscribe-store"
      fallbackLabel="subscription"
    />
  );
}
