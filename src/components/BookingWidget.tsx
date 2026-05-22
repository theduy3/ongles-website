"use client";

import { useEffect, useRef } from "react";
import type { Locale } from "@/lib/i18n";

// TODO(owner): replace with the Pure Nail Bar Booker embed URL once the
// widget endpoint is confirmed. Pure Nail Bar uses Booker (go.booker.com),
// not the previous SalonX provider.
const WIDGET_SRC = "";
const STORE = "purenailbar";

// Embeds the Booker booking widget. The widget script mounts its UI as the next
// sibling of its own <script data-store> tag, so we inject that script into this
// ref'd container (rather than via next/script, which hoists scripts to end-of-
// body and would strand the widget below the page). data-lang keeps the widget's
// initial language in sync with the active locale.
export function BookingWidget({ locale }: { locale: Locale }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    // Guard against double-injection (Strict Mode double-effect, re-mounts).
    if (container.querySelector("script[data-store]")) return;

    const script = document.createElement("script");
    script.src = WIDGET_SRC;
    script.async = true;
    script.setAttribute("data-store", STORE);
    script.setAttribute("data-lang", locale);
    container.appendChild(script);

    return () => container.replaceChildren();
  }, [locale]);

  return <div ref={ref} className="mt-10 min-h-[420px]" />;
}
