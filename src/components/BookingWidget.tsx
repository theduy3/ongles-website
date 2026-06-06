"use client";

import { useEffect, useRef } from "react";
import type { Locale } from "@/lib/i18n";

// Embeds the Booker booking widget. The widget script mounts its UI as the next
// sibling of its own <script data-store> tag, so we inject that script into this
// ref'd container (rather than via next/script, which hoists scripts to end-of-
// body and would strand the widget below the page). data-lang keeps the widget's
// initial language in sync with the active locale.
//
// Lifecycle note: do NOT add an effect cleanup that wipes the container. React
// Strict Mode runs effect setup → cleanup → setup on mount; a cleanup that
// removes the injected <script> defeats the dedupe guard below, causing two
// script tags to load and the external widget to mount twice. The widget lives
// for the lifetime of this route — when the user navigates away, React unmounts
// the whole subtree (container div included), so no manual teardown is needed.
export function BookingWidget({
  locale,
  storeId = "OM",
  widgetHost = "https://app.onglesmaily.com",
}: {
  locale: Locale;
  storeId?: string;
  widgetHost?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    // Guard against double-injection (Strict Mode double-effect, re-mounts).
    if (container.querySelector("script[data-store]")) return;

    const script = document.createElement("script");
    script.src = `${widgetHost}/widgets/booking-widget.js`;
    script.async = true;
    script.setAttribute("data-store", storeId);
    script.setAttribute("data-lang", locale);
    container.appendChild(script);
  }, [locale, storeId, widgetHost]);

  return <div ref={ref} className="mt-10 min-h-[420px]" />;
}
