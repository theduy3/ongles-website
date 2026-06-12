"use client";

import { WidgetEmbed } from "@/components/WidgetEmbed";

// Embeds the client-account widget on the un-localized /clientportal page.
// Injection, loading and error/retry handling live in WidgetEmbed. Unlike the
// check-in/queue widgets, this script keys off `data-account-store` (not
// `data-store`), so we pass the attribute name through storeAttr.
export function ClientPortalWidget({
  storeId = "OM",
  widgetHost = "https://app.onglesmaily.com",
}: {
  storeId?: string;
  widgetHost?: string;
}) {
  return (
    <WidgetEmbed
      src={`${widgetHost}/widgets/client-account-widget.js`}
      store={storeId}
      storeAttr="data-account-store"
      fallbackLabel="client portal"
    />
  );
}
