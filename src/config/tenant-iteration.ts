// Shared by config-completeness.ts and schema-invariants.ts — both are pure,
// alias-free validators loaded by next.config.ts through the SWC require-hook
// (relative imports only; see either file's header for the constraint). This
// module is itself alias-free — no `@/` imports, no runtime deps — so it stays
// safe to import from that chain.
//
// "template" is a clone source for new tenants, not a live deployment — it is
// exempt from the completeness bar and the schema invariant checks. A new
// tenant added to TENANT_REGISTRY before its config is fully filled must either
// be completed first or temporarily added here.
export const EXCLUDED_TENANTS = new Set(["template"]);

// Walks every tenant in `registry` except EXCLUDED_TENANTS, calling `fn(id, cfg)`
// and flattening the returned arrays. The registry-walk-and-skip shape every
// tenant validator repeats; `fn` carries the actual per-tenant check. Stateful
// checks (e.g. a cross-tenant uniqueness Map) close over their own state outside
// the call — `fn` itself stays a pure per-tenant → results mapping.
export function forEachTenant<TCfg, TResult>(
  registry: Record<string, TCfg>,
  fn: (id: string, cfg: TCfg) => TResult[],
): TResult[] {
  const results: TResult[] = [];
  for (const [id, cfg] of Object.entries(registry)) {
    if (EXCLUDED_TENANTS.has(id)) continue;
    results.push(...fn(id, cfg));
  }
  return results;
}
