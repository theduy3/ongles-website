/**
 * WebVitalsReporter.test.tsx — bun:test for src/components/WebVitalsReporter.tsx
 *
 * Strategy:
 *   - Mock `next/web-vitals` to capture the callback registered via useReportWebVitals.
 *   - Install a window.gtag spy and invoke the captured callback with metric fixtures.
 *   - Assert the gtag call arguments match the expected GA4 event payload.
 *
 * These tests verify MEAS-02: WebVitalsReporter calls window.gtag event for CWV
 * metrics (INP/LCP/CLS) via useReportWebVitals from next/web-vitals (built-in).
 */

import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";

// ─── Mock next/web-vitals ──────────────────────────────────────────────────────
// Capture the callback so we can invoke it in tests.

type WebVitalsCallback = (metric: {
  name: string;
  id: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  entries: unknown[];
  navigationType: string;
}) => void;

let capturedCallback: WebVitalsCallback | undefined;

mock.module("next/web-vitals", () => ({
  useReportWebVitals: (cb: WebVitalsCallback) => {
    capturedCallback = cb;
  },
}));

// ─── Mock react (useCallback returns the fn as-is) ────────────────────────────
mock.module("react", () => ({
  useCallback: (fn: unknown) => fn,
}));

// ─── gtag spy helpers ─────────────────────────────────────────────────────────

type GtagCall = { command: string; name: string; params: Record<string, unknown> };
let gtagCalls: GtagCall[];

function installGtagSpy() {
  gtagCalls = [];
  (globalThis as Record<string, unknown>).window = {
    gtag: (command: string, name: string, params: Record<string, unknown>) => {
      gtagCalls.push({ command, name, params });
    },
  };
}

function removeGtagSpy() {
  (globalThis as Record<string, unknown>).window = undefined;
  gtagCalls = [];
}

// ─── Metric fixtures ──────────────────────────────────────────────────────────

const inpMetric = {
  name: "INP",
  id: "v4-1234567890-1",
  value: 200,
  rating: "needs-improvement" as const,
  delta: 200,
  entries: [],
  navigationType: "navigate",
};

const clsMetric = {
  name: "CLS",
  id: "v4-1234567890-2",
  value: 0.12,
  rating: "good" as const,
  delta: 0.12,
  entries: [],
  navigationType: "navigate",
};

const lcpMetric = {
  name: "LCP",
  id: "v4-1234567890-3",
  value: 2500,
  rating: "good" as const,
  delta: 2500,
  entries: [],
  navigationType: "navigate",
};

// ─── Helper: trigger the component's hook registration ───────────────────────

async function mountReporter(measurementId: string) {
  capturedCallback = undefined;
  const { WebVitalsReporter } = await import("./WebVitalsReporter");
  // In bun:test, call the function component directly to trigger useReportWebVitals
  // (the mock captures the callback synchronously).
  WebVitalsReporter({ measurementId });
  return capturedCallback;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("WebVitalsReporter — INP metric", () => {
  beforeEach(installGtagSpy);
  afterEach(removeGtagSpy);

  it("calls window.gtag with event 'INP' when an INP metric fires", async () => {
    const cb = await mountReporter("G-TEST12345");
    expect(cb).toBeDefined();
    cb!(inpMetric);
    expect(gtagCalls).toHaveLength(1);
    expect(gtagCalls[0].command).toBe("event");
    expect(gtagCalls[0].name).toBe("INP");
  });

  it("includes value as Math.round of metric.value for INP (no scaling)", async () => {
    const cb = await mountReporter("G-TEST12345");
    cb!(inpMetric);
    expect(gtagCalls[0].params.value).toBe(200); // Math.round(200) = 200
  });

  it("includes event_label as metric.id", async () => {
    const cb = await mountReporter("G-TEST12345");
    cb!(inpMetric);
    expect(gtagCalls[0].params.event_label).toBe("v4-1234567890-1");
  });

  it("sets non_interaction to true", async () => {
    const cb = await mountReporter("G-TEST12345");
    cb!(inpMetric);
    expect(gtagCalls[0].params.non_interaction).toBe(true);
  });

  it("includes metric_rating matching the rating field", async () => {
    const cb = await mountReporter("G-TEST12345");
    cb!(inpMetric);
    expect(gtagCalls[0].params.metric_rating).toBe("needs-improvement");
  });
});

describe("WebVitalsReporter — CLS metric (x1000 scaling)", () => {
  beforeEach(installGtagSpy);
  afterEach(removeGtagSpy);

  it("calls window.gtag with event 'CLS' when a CLS metric fires", async () => {
    const cb = await mountReporter("G-TEST12345");
    cb!(clsMetric);
    expect(gtagCalls[0].name).toBe("CLS");
  });

  it("scales CLS value by x1000 and rounds to integer", async () => {
    const cb = await mountReporter("G-TEST12345");
    cb!(clsMetric);
    // 0.12 * 1000 = 120, rounded = 120
    expect(gtagCalls[0].params.value).toBe(120);
  });
});

describe("WebVitalsReporter — LCP metric", () => {
  beforeEach(installGtagSpy);
  afterEach(removeGtagSpy);

  it("reports LCP value without x1000 scaling", async () => {
    const cb = await mountReporter("G-TEST12345");
    cb!(lcpMetric);
    expect(gtagCalls[0].name).toBe("LCP");
    expect(gtagCalls[0].params.value).toBe(2500);
  });
});

describe("WebVitalsReporter — empty measurementId (guard)", () => {
  beforeEach(installGtagSpy);
  afterEach(removeGtagSpy);

  it("does NOT call window.gtag when measurementId is empty", async () => {
    const cb = await mountReporter("");
    // Even if the callback exists, it should bail when measurementId is empty.
    if (cb) {
      cb(inpMetric);
    }
    expect(gtagCalls).toHaveLength(0);
  });
});
