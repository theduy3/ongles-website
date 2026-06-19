"use client";

/**
 * WebVitalsReporter.tsx — Client island that wires Next.js built-in CWV reporting to GA4.
 *
 * Uses `useReportWebVitals` from `next/web-vitals` (bundled by Next.js 16.2.6).
 * Do NOT add the external `web-vitals` npm package — it is redundant and adds
 * dual-lockfile risk (see RESEARCH.md Standard Stack section).
 *
 * Called by: src/app/[lang]/layout.tsx (Server Component — safe to mount as island).
 * Depends on: GA4 window.gtag injected by the inline beforeInteractive Script in layout.tsx.
 *
 * MEAS-02: Reports INP, LCP, CLS (and TTFB, FCP, FID) to the per-tenant GA4 property.
 * Consent guard: gtag calls are no-ops when analytics_storage is denied (Consent Mode v2).
 */

import { useCallback } from "react";
import { useReportWebVitals } from "next/web-vitals";

type WebVitalsMetric = Parameters<typeof useReportWebVitals>[0];

/**
 * WebVitalsReporter — mounts in the root layout as a 'use client' island.
 * Returns null (no UI). Bail early when measurementId is empty (no GA4 configured).
 */
export function WebVitalsReporter({
  measurementId,
}: {
  measurementId: string;
}) {
  const handleMetric = useCallback(
    (metric: WebVitalsMetric) => {
      // Guard: do not emit if GA4 is not configured for this tenant.
      if (!measurementId) return;

      // window.gtag is injected by the inline beforeInteractive consent Script.
      // Optional chaining is a no-op when gtag has not loaded yet; queued calls
      // are replayed when gtag.js loads (via window.dataLayer).
      if (typeof window !== "undefined" && typeof window.gtag === "function") {
        window.gtag("event", metric.name, {
          // CLS is a fraction (e.g. 0.12); GA4 requires integer values — scale x1000.
          // All other metrics are already in milliseconds (integers).
          // Source: Next.js docs → useReportWebVitals → Sending results to Google Analytics.
          value: Math.round(
            metric.name === "CLS" ? metric.value * 1000 : metric.value,
          ),
          event_label: metric.id, // unique to current page load — enables percentile calc
          non_interaction: true, // does not affect bounce rate
          metric_rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
        });
      }
    },
    [measurementId],
  );

  useReportWebVitals(handleMetric);

  return null;
}
