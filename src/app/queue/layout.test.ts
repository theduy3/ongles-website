import { describe, expect, it, mock } from "bun:test";

// Layout does `import "../globals.css"` — neutralize for bun:test.
mock.module("../globals.css", () => ({}));

let faviconValue: string | undefined;
mock.module("@/lib/store-config", () => ({
  getStoreConfig: async () => ({
    site: faviconValue ? { favicon: faviconValue } : {},
  }),
}));

const { generateMetadata } = await import("./layout");

describe("queue layout generateMetadata — per-tenant favicon", () => {
  it("sets icons.icon to the tenant favicon when one is configured", async () => {
    faviconValue = "https://cdn.example/rivieres-fav.png";
    const meta = await generateMetadata();
    expect(meta.icons).toEqual({ icon: "https://cdn.example/rivieres-fav.png" });
  });

  it("omits icons when the tenant has no favicon (falls back to icon.png)", async () => {
    faviconValue = undefined;
    const meta = await generateMetadata();
    expect(meta.icons).toBeUndefined();
  });

  it("keeps the queue title and noindex robots", async () => {
    faviconValue = "https://cdn.example/x.png";
    const meta = await generateMetadata();
    expect(meta.title).toBe("Queue");
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  // Must render dynamically — see admin/layout.test.ts for the full rationale:
  // a static prerender bakes the build-time tenant favicon into the HTML.
  it("opts into dynamic rendering so the favicon resolves from the runtime TENANT", async () => {
    const mod = await import("./layout");
    expect(mod.dynamic).toBe("force-dynamic");
  });
});
