import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";

// Supabase is server-only here (no browser usage), so its env vars must NOT carry
// the NEXT_PUBLIC_ prefix — that prefix inlines the value into the client bundle at
// BUILD time, which re-pins per-tenant secrets to the build tenant. Reading plain
// server env keeps them runtime-supplied per container.
test("supabase.ts reads server-only env names (no NEXT_PUBLIC_ for supabase)", () => {
  const src = readFileSync("src/lib/supabase.ts", "utf8");
  expect(src).toContain("process.env.SUPABASE_URL");
  expect(src).toContain("process.env.SUPABASE_ANON_KEY");
  expect(src).toContain("process.env.SUPABASE_TENANT_JWT");
  expect(src).not.toContain("NEXT_PUBLIC_SUPABASE_URL");
  expect(src).not.toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  expect(src).not.toContain("NEXT_PUBLIC_SUPABASE_TENANT_JWT");
});
