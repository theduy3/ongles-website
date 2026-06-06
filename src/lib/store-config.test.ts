import { describe, expect, it } from "bun:test";
import { getStoreConfig, mergeServicesById } from "@/lib/store-config";
import { site as staticSite, services as staticServices } from "@/config";

describe("getStoreConfig (no DB in test env)", () => {
  it("returns static site.name when no DB override exists", async () => {
    // WHY: Without Supabase configured, getStoreConfig must return the static
    // tenant config unchanged — the fallback guarantees the site is always
    // renderable even before any DB row has been created.
    const { site } = await getStoreConfig();
    expect(site.name).toBe(staticSite.name);
  });

  it("returns the single primary location (locations array length 1)", async () => {
    // WHY: The legacy `locations` export is always a 1-element array wrapping
    // tenant.location. getStoreConfig must preserve that shape so all consumers
    // that iterate `locations` don't break.
    const { locations } = await getStoreConfig();
    expect(locations).toHaveLength(1);
  });

  it("preserves static service ids and slugs when no override exists", async () => {
    // WHY: Service ids and slugs are structural routing keys baked at build
    // time. A missing or misconfigured DB row must never erase them.
    const { services } = await getStoreConfig();
    const staticIds = staticServices.map((s) => s.id);
    const mergedIds = services.map((s) => s.id);
    expect(mergedIds).toEqual(staticIds);

    // Slugs must be identical objects (not mutated copies).
    for (let i = 0; i < staticServices.length; i++) {
      expect(services[i].slug).toEqual(staticServices[i].slug);
    }
  });

  it("returns the same number of services as the static config", async () => {
    // WHY: The merge-by-id strategy must never add or remove services; it only
    // patches value fields (price/priceTo/photo) on existing entries.
    const { services } = await getStoreConfig();
    expect(services).toHaveLength(staticServices.length);
  });
});

describe("getStoreConfig customCode", () => {
  it("returns an empty customCode array when no DB override exists", async () => {
    // WHY: The resolver must always expose customCode so consumers can iterate
    // without null-checking. When no DB row is present (test env), it must be [].
    const config = await getStoreConfig();
    expect(Array.isArray(config.customCode)).toBe(true);
    expect(config.customCode).toEqual([]);
  });
});

describe("mergeServicesById (unit)", () => {
  const base = staticServices as typeof staticServices;

  it("applies override price while preserving id and slug", () => {
    // WHY: The primary use case — an operator bumps a service price in the
    // admin UI. The override must patch price only and leave slug/id intact.
    const result = mergeServicesById(base, [{ id: "pose-ongles", price: 99 }]);
    const svc = result.find((s) => s.id === "pose-ongles")!;
    expect(svc.price).toBe(99);
    expect(svc.id).toBe("pose-ongles");
    expect(svc.slug).toEqual(base.find((s) => s.id === "pose-ongles")!.slug);
  });

  it("applies priceTo and photo overrides", () => {
    // WHY: All three value fields (price, priceTo, photo) must be patchable
    // independently; a partial override must leave the rest untouched.
    const result = mergeServicesById(base, [
      { id: "remplissage", priceTo: 55, photo: true },
    ]);
    const svc = result.find((s) => s.id === "remplissage")!;
    expect(svc.priceTo).toBe(55);
    expect(svc.photo).toBe(true);
    // price comes from static
    expect(svc.price).toBe(base.find((s) => s.id === "remplissage")!.price);
  });

  it("ignores override items with no matching static id", () => {
    // WHY: An override row with an id that doesn't exist in the static config
    // must be silently dropped (defensive: schema rejects unknown ids, but the
    // merge layer should also be safe on its own).
    const result = mergeServicesById(base, [
      { id: "pose-ongles", price: 42 },
      // cast to bypass TS — simulating a stale/corrupt override row
      { id: "unknown-service" as never, price: 1 },
    ]);
    // Length must equal static — no extra entries appended.
    expect(result).toHaveLength(base.length);
  });

  it("leaves static service untouched when no override item matches", () => {
    // WHY: Services with no override entry must be returned as exact copies of
    // the static service — no accidental mutation of other entries.
    const original = base.find((s) => s.id === "soins-pieds")!;
    const result = mergeServicesById(base, [{ id: "pose-ongles", price: 1 }]);
    const svc = result.find((s) => s.id === "soins-pieds")!;
    expect(svc).toEqual(original);
  });

  it("preserves the original order of static services", () => {
    // WHY: Consumers render services in the order they appear in the config.
    // The merge must never reorder entries regardless of override item order.
    const result = mergeServicesById(base, [
      { id: "soins-pieds", price: 10 },
      { id: "pose-ongles", price: 20 },
    ]);
    const ids = result.map((s) => s.id);
    const staticIds = [...base].map((s) => s.id);
    expect(ids).toEqual(staticIds);
  });

  it("returns new objects (immutability — does not mutate static services)", () => {
    // WHY: Static services are readonly; merging must produce new objects so
    // the original config is never mutated across requests.
    const result = mergeServicesById(base, [{ id: "pose-ongles", price: 999 }]);
    const original = base.find((s) => s.id === "pose-ongles")!;
    // The original must be untouched.
    expect(original.price).not.toBe(999);
    // The result must be a different object reference.
    expect(result.find((s) => s.id === "pose-ongles")).not.toBe(original);
  });
});
