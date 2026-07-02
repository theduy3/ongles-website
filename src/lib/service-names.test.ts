import { describe, expect, it } from "bun:test";
import { buildServiceNames } from "@/lib/services";
import type { Service, ServiceId } from "@/config/types";

const svcA = {
  id: "svc-a",
  slug: { fr: "a-fr", en: "a-en" },
  price: 50,
  photo: false,
} as unknown as Service;

const svcB = {
  id: "svc-b",
  slug: { fr: "b-fr", en: "b-en" },
  price: 60,
  photo: false,
} as unknown as Service;

const services: readonly Service[] = [svcA, svcB];

const titles = {
  "svc-a": { title: "Manucure" },
  "svc-b": { title: "Pose d'ongles" },
} as unknown as Record<ServiceId, { title: string }>;

describe("buildServiceNames", () => {
  it("maps every service id to its human-readable title", () => {
    expect(buildServiceNames(services, titles)).toEqual({
      "svc-a": "Manucure",
      "svc-b": "Pose d'ongles",
    });
  });

  // Fail-loud (matches the pricing presenter): a missing title is a
  // locale-parity defect, never a fallback to the raw id — a raw id would
  // surface as a customer-facing service name in the near-me link labels.
  it("throws when a service title is missing", () => {
    const partial = {
      "svc-a": { title: "Manucure" },
    } as unknown as Record<ServiceId, { title: string }>;
    expect(() => buildServiceNames(services, partial)).toThrow();
  });
});
