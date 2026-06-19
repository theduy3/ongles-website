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

// Inline the subset of the web-vitals Metric shape we use, to avoid importing
// from next/dist/compiled/web-vitals which has no bundled .d.ts in this version.
export interface WebVitalMetric {
  name: string;
  id: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
}

/**
 * Pure metric handler — exported for unit testing without a React renderer.
 * Emits a GA4 event via window.gtag when measurementId is non-empty.
 *
 * CLS is scaled x1000 (GA4 requires integer values; CLS is a fraction, e.g. 0.12).
 * All other CWV metrics are already in milliseconds.
 */
export function handleWebVitalMetric(
  metric: WebVitalMetric,
  measurementId: string,
): void {
  if (!measurementId) return;
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", metric.name, {
      // Source: Next.js docs → useReportWebVitals → Sending results to Google Analytics.
      value: Math.round(
        metric.name === "CLS" ? metric.value * 1000 : metric.value,
      ),
      event_label: metric.id,     // unique to current page load — enables percentile calc
      non_interaction: true,       // does not affect bounce rate
      metric_rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
    });
  }
}

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
    (metric: WebVitalMetric) => handleWebVitalMetric(metric, measurementId),
    [measurementId],
  );

  useReportWebVitals(handleMetric);

  return null;
}
