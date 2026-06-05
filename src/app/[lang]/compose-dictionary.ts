import { deepMerge } from "@/config/deep-merge";

type Content = Record<string, unknown>;

// Pure 3-way dictionary compose: base → tenantOverride → dbOverride.
// Each layer deep-merges over the previous; later layers win on leaf collisions.
// Extracted into its own file (no server-only, no Next.js deps) so it can be
// unit-tested in bun:test without a Next.js runtime.
export function composeDictionary(
  baseLayer: Content,
  tenantLayer: Content,
  dbLayer: Content,
): Content {
  return deepMerge(deepMerge(baseLayer, tenantLayer), dbLayer);
}
