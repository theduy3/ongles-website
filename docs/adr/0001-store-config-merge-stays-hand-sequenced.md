# ADR 0001 — store-config merge stays hand-sequenced

- **Status:** Accepted
- **Date:** 2026-07-01
- **Context module:** Resolved config / Store settings (see `CONTEXT.md`)

## Context

`resolveStoreConfig()` in `src/lib/store-config.ts` merges the sparse Supabase
store-settings override over the static tenant config with three hand-sequenced
calls:

```ts
const mergedSite     = deepMerge(staticSite, override.site ?? {});
const mergedLocation = deepMerge(staticLocations[0], override.location ?? {});
const mergedServices = mergeServicesById(staticServices, override.services ?? []);
// customCode is replace, not merge: override.customCode ?? []
```

Two strategies are in play: `deepMerge` (`src/config/deep-merge.ts` — objects
recurse, arrays replace, override leaves win) for `site`/`location`, and
`mergeServicesById` (identity-keyed patching of `price`/`priceTo`/`photo` while
preserving `id`/`slug`) for `services`, because `deepMerge` would replace the
services array wholesale and drop unpatched services.

An architecture review (`/improve-codebase-architecture`, 2026-07-01) flagged the
two-strategy split as friction and proposed a declarative merge-spec:
`resolve(static, override, { site: "deep", location: "deep", services: "byId" })`.

## Decision

**Keep the merge hand-sequenced. Do not introduce a merge-spec abstraction.**

## Rationale

- **Deletion test moves complexity, doesn't concentrate it.** Deleting a merge-spec
  and its dispatcher makes the three merge calls reappear — but they are already
  three clear lines, each with a one-line comment. A spec adds hops (read spec →
  find dispatcher → find strategy) where today there is one (read line → read
  comment). Negative locality.
- **No leverage to buy it back.** Leverage comes from one interface paying off
  across N call sites or a varying adapter. Here there is **one** call site
  (`resolveStoreConfig`), **three** fields, and a **static** strategy-per-field
  mapping fixed at author time — never data-driven. A merge-spec is the machinery
  for runtime-varying strategies or an open field set; neither holds.
- **The right seam already exists.** `deepMerge` and `mergeServicesById` are
  already separate, individually unit-tested strategy modules. The extraction a
  merge-spec would claim to provide is already present at the correct seam.
- **Simplicity first.** Adding indirection over correct, tested, commented code
  for zero gain is the over-abstraction this project's rules guard against.

## Consequences

- `src/lib/store-config.ts` stays as-is. Future architecture reviews should not
  re-suggest a merge-spec / strategy-dispatch abstraction for this module.
- If a real driver appears later — strategies that vary at runtime, an
  operator-configurable field set, or a third merged config domain that needs its
  own strategy — reopen this ADR; that would change the leverage calculus.
