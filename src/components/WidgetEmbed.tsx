"use client";

import { useEffect, useRef, useState } from "react";

type Status = "loading" | "ready" | "error";

// Shared embed for the SalonX kiosk widgets (check-in, technician queue). The
// widget script mounts its UI as the next sibling of its own <script data-store>
// tag, so we inject that script imperatively into a ref'd container that carries
// no JSX children — React never reconciles inside it, so it can't clobber the
// widget's injected DOM. A sibling overlay, fully React-managed, shows a spinner
// until the script loads and an error fallback (with retry) if it fails. Unlike
// the booking widget, no data-lang is set — the kiosk pages are un-localized.
export function WidgetEmbed({
  src,
  store,
  fallbackLabel,
}: {
  src: string;
  store: string;
  // Names the widget in the error message, e.g. "check-in" or "queue".
  fallbackLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("loading");
  // Bumping this re-runs the injection effect — drives the retry button.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    let cancelled = false;
    setStatus("loading");
    // Clear any prior injection (retry, Strict Mode double-effect, re-mounts).
    container.replaceChildren();

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.setAttribute("data-store", store);
    script.onload = () => {
      if (!cancelled) setStatus("ready");
    };
    script.onerror = () => {
      if (!cancelled) setStatus("error");
    };
    container.appendChild(script);

    return () => {
      cancelled = true;
      container.replaceChildren();
    };
  }, [src, store, attempt]);

  return (
    <div className="relative min-h-screen">
      <div ref={ref} className="min-h-screen" />

      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-fog">
          <span
            role="status"
            aria-label="Loading"
            className="size-10 animate-spin rounded-full border-4 border-tan border-t-espresso"
          />
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-fog px-6 text-center">
          <p className="max-w-sm text-lg leading-relaxed text-mocha">
            Unable to load the {fallbackLabel}. Please check your connection and
            try again.
          </p>
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="inline-flex items-center justify-center rounded-pill bg-espresso px-8 py-3 text-sm font-semibold uppercase tracking-wide text-cream transition-colors hover:bg-mocha"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
