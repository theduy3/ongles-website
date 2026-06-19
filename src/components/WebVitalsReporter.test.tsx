/**
 * WebVitalsReporter.test.tsx — bun:test for WebVitalsReporter CWV logic.
 *
 * Tests the exported pure handler `handleWebVitalMetric(metric, measurementId)`.
 * This avoids React hook context issues in bun:test (no DOM renderer available).
 *
 * The handler is the only testable logic in the component: the useReportWebVitals
 * hook wiring is a React runtime detail verified by the Next.js test suite.
 *
 * MEAS-02: WebVitalsReporter calls window.gtag for INP/LCP/CLS with correct params.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { handleWebVitalMetric, type WebVitalMetric } from "./WebVitalsReporter";

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

const inpMetric: WebVitalMetric = {
  name: "INP",
  id: "v4-1234567890-1",
  value: 200,
  rating: "needs-improvement",
};

const clsMetric: WebVitalMetric = {
  name: "CLS",
  id: "v4-1234567890-2",
  value: 0.12,
  rating: "good",
};

const lcpMetric: WebVitalMetric = {
  name: "LCP",
  id: "v4-1234567890-3",
  value: 2500,
  rating: "good",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("handleWebVitalMetric() — INP metric", () => {
  beforeEach(installGtagSpy);
  afterEach(removeGtagSpy);

  it("calls window.gtag with command 'event' and name 'INP'", () => {
    handleWebVitalMetric(inpMetric, "G-TEST12345");
    expect(gtagCalls).toHaveLength(1);
    expect(gtagCalls[0].command).toBe("event");
    expect(gtagCalls[0].name).toBe("INP");
  });

  it("includes value as Math.round of metric.value for INP (no scaling)", () => {
    handleWebVitalMetric(inpMetric, "G-TEST12345");
    expect(gtagCalls[0].params.value).toBe(200); // Math.round(200) = 200
  });

  it("includes event_label as metric.id", () => {
    handleWebVitalMetric(inpMetric, "G-TEST12345");
    expect(gtagCalls[0].params.event_label).toBe("v4-1234567890-1");
  });

  it("sets non_interaction to true", () => {
    handleWebVitalMetric(inpMetric, "G-TEST12345");
    expect(gtagCalls[0].params.non_interaction).toBe(true);
  });

  it("includes metric_rating matching the rating field", () => {
    handleWebVitalMetric(inpMetric, "G-TEST12345");
    expect(gtagCalls[0].params.metric_rating).toBe("needs-improvement");
  });
});

describe("handleWebVitalMetric() — CLS metric (x1000 scaling)", () => {
  beforeEach(installGtagSpy);
  afterEach(removeGtagSpy);

  it("calls window.gtag with event 'CLS'", () => {
    handleWebVitalMetric(clsMetric, "G-TEST12345");
    expect(gtagCalls[0].name).toBe("CLS");
  });

  it("scales CLS value by x1000 and rounds to integer", () => {
    handleWebVitalMetric(clsMetric, "G-TEST12345");
    // 0.12 * 1000 = 120, rounded = 120
    expect(gtagCalls[0].params.value).toBe(120);
  });
});

describe("handleWebVitalMetric() — LCP metric", () => {
  beforeEach(installGtagSpy);
  afterEach(removeGtagSpy);

  it("reports LCP without x1000 scaling", () => {
    handleWebVitalMetric(lcpMetric, "G-TEST12345");
    expect(gtagCalls[0].name).toBe("LCP");
    expect(gtagCalls[0].params.value).toBe(2500);
  });
});

describe("handleWebVitalMetric() — empty measurementId (guard)", () => {
  beforeEach(installGtagSpy);
  afterEach(removeGtagSpy);

  it("does NOT call window.gtag when measurementId is empty string", () => {
    handleWebVitalMetric(inpMetric, "");
    expect(gtagCalls).toHaveLength(0);
  });
});

describe("handleWebVitalMetric() — window.gtag absent (SSR-safe)", () => {
  it("does not throw when window is undefined", () => {
    (globalThis as Record<string, unknown>).window = undefined;
    expect(() => handleWebVitalMetric(inpMetric, "G-TEST12345")).not.toThrow();
  });
});
