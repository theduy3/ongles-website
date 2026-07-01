// Shared by config-completeness.ts and schema-invariants.ts — both are pure,
// alias-free validators loaded by next.config.ts through the SWC require-hook
// (relative imports only; see either file's header for the constraint).
//
// "template" is a clone source for new tenants, not a live deployment — it is
// exempt from the completeness bar and the schema invariant checks. A new
// tenant added to TENANT_REGISTRY before its config is fully filled must either
// be completed first or temporarily added here.
export const EXCLUDED_TENANTS = new Set(["template"]);
