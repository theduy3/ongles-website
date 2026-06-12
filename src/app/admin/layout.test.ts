import { describe, expect, it, mock } from "bun:test";

// The layout does `import "../globals.css"` — neutralize so the module loads
// under bun:test without a CSS loader.
mock.module("../globals.css", () => ({}));

// Per-tenant favicon comes from getStoreConfig().site.favicon. Drive it via a
// mutable closure variable so each case flips one value instead of re-mocking
// (which fights ESM module caching across the single dynamic import below).
let faviconValue: string | undefined;
mock.module("@/lib/store-config", () => ({
  getStoreConfig: async () => ({
    site: faviconValue ? { favicon: faviconValue } : {},
  }),
}));

const { generateMetadata } = await import("./layout");

describe("admin layout generateMetadata — per-tenant favicon", () => {
  it("sets icons.icon to the tenant favicon when one is configured", async () => {
    faviconValue = "https://cdn.example/charlesbourg-fav.png";
    const meta = await generateMetadata();
    expect(meta.icons).toEqual({ icon: "https://cdn.example/charlesbourg-fav.png" });
  });

  it("omits icons when the tenant has no favicon (falls back to icon.png)", async () => {
    faviconValue = undefined;
    const meta = await generateMetadata();
    expect(meta.icons).toBeUndefined();
  });

  it("keeps the admin title and noindex robots", async () => {
    faviconValue = "https://cdn.example/x.png";
    const meta = await generateMetadata();
    expect(meta.title).toBe("Popup admin");
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  // Must render dynamically: one universal image serves every tenant, with
  // TENANT chosen per container at runtime. A statically prerendered layout
  // would bake the build-time tenant's favicon (ongles-maily) into the HTML —
  // the exact bug. force-dynamic re-resolves getStoreConfig per request.
  it("opts into dynamic rendering so the favicon resolves from the runtime TENANT", async () => {
    const mod = await import("./layout");
    expect(mod.dynamic).toBe("force-dynamic");
  });
});
