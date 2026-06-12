import { test, expect } from "bun:test";
import { Glob } from "bun";

// Guard against re-introducing the all-tenants-render-maily bug at the client boundary.
//
// A "use client" component must NOT import the runtime tenant VALUE from @/config (or
// @/lib/site, @/lib/locations). Those modules resolve process.env.TENANT; importing a
// value pulls the build-time tenant into the client bundle, re-pinning the brand. The
// server resolves the tenant and prop-drills `site` down instead (see [lang]/layout).
// Type-only imports (`import type ... from "@/config/types"`) are erased — they are fine.
test("no client component imports the runtime tenant value", async () => {
  const offenders: string[] = [];
  const glob = new Glob("src/**/*.{ts,tsx}");
  for await (const path of glob.scan(".")) {
    const src = await Bun.file(path).text();
    if (!/^\s*["']use client["']/m.test(src)) continue;
    // A value import (not `import type`) whose specifier is exactly one of the
    // tenant-resolving modules. Subpaths like @/config/types are intentionally allowed.
    const valueImport =
      /import\s+(?!type\b)[^;]*from\s+["']@\/(config|lib\/site|lib\/locations)["']/;
    if (valueImport.test(src)) offenders.push(path);
  }
  expect(offenders).toEqual([]);
});
