import { describe, expect, it, mock } from "bun:test";

mock.module("../globals.css", () => ({}));

let runtimeReads = 0;
mock.module("@/lib/store-config", () => ({
  getStoreConfig: async () => {
    runtimeReads += 1;
    return { site: {} };
  },
}));

const { generateMetadata } = await import("./layout");

describe("top employee layout generateMetadata", () => {
  it("returns static metadata without waiting for runtime settings", async () => {
    const meta = await generateMetadata();
    expect(meta.title).toBe("Top employee");
    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(meta.icons).toBeUndefined();
    expect(runtimeReads).toBe(0);
  });

  it("keeps the standalone page request-rendered", async () => {
    const mod = await import("./layout");
    expect(mod.dynamic).toBe("force-dynamic");
  });
});
