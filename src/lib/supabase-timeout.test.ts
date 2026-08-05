import { expect, it } from "bun:test";
import { getPublicClientOptions, SUPABASE_PUBLIC_TIMEOUT_MS } from "@/lib/supabase";

it("bounds public Supabase PostgREST requests", () => {
  const options = getPublicClientOptions();

  expect(SUPABASE_PUBLIC_TIMEOUT_MS).toBe(2_000);
  expect(options.db?.timeout).toBe(SUPABASE_PUBLIC_TIMEOUT_MS);
});
