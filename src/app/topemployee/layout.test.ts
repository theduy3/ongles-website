import { describe, expect, it, mock } from "bun:test";

mock.module("../globals.css", () => ({}));

let faviconValue: string | undefined;
mock.module("@/lib/store-config", () => ({
  getStoreConfig: async () => ({
    site: faviconValue ? { favicon: faviconValue } : {},
  }),
}));

const { generateMetadata } = await import("./layout");

describe("top employee layout generateMetadata", () => {
  it("sets icons.icon to the tenant favicon when one is configured", async () => {
    faviconValue = "https://cdn.example/maily-fav.png";
    const meta = await generateMetadata();
    expect(meta.icons).toEqual({ icon: "https://cdn.example/maily-fav.png" });
  });

  it("omits icons when the tenant has no favicon", async () => {
    faviconValue = undefined;
    const meta = await generateMetadata();
    expect(meta.icons).toBeUndefined();
  });

  it("keeps the page title and noindex robots", async () => {
    faviconValue = "https://cdn.example/x.png";
    const meta = await generateMetadata();
    expect(meta.title).toBe("Top employee");
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it("opts into dynamic rendering for runtime tenant metadata", async () => {
    const mod = await import("./layout");
    expect(mod.dynamic).toBe("force-dynamic");
  });
});
