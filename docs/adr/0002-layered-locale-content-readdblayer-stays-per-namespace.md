# ADR 0002 — layered-locale-content readDbLayer stays per-namespace

- **Status:** Accepted
- **Date:** 2026-07-01
- **Context module:** Layered locale content (see `CONTEXT.md`)

## Context

`layeredLocaleContent()` (`src/app/[lang]/layered-locale-content.ts`) is the
per-locale resolver factory shared by two namespaces. Each caller injects a
`readDbLayer(settings, locale)` that shapes the db override layer:

```ts
// dictionaries.ts — trivial 1:1 namespace extraction
readDbLayer: (settings, locale) => (settings?.content?.[locale] ?? {}),

// seo-content.ts — bespoke: lift legacy content-namespace SEO as a floor,
// warn on lift, then deepMerge under explicit `seo` edits
readDbLayer: (settings, locale) => {
  const legacy = liftLegacySeo(settings?.content?.[locale]);
  const current = settings?.seo?.[locale] ?? {};
  if (Object.keys(legacy).length > 0) console.warn(/* migration signal */);
  return deepMerge(legacy, current);
},
```

An architecture review (`/improve-codebase-architecture`, 2026-07-01) flagged the
`settings?.[ns]?.[locale]` extraction as duplicated (Candidate 5, Speculative) and
proposed a `namespace`-keyed default reader so `dictionaries.ts` could drop its
`readDbLayer`.

## Decision

**Keep `readDbLayer` per-caller. Do not add a `namespace` default to the factory.**

## Rationale

- **One adapter, not two.** A real seam needs behaviour that varies across two
  adapters. Only the dictionary case fits a `settings?.[ns]?.[locale]` default;
  the seo case is bespoke (legacy lift + warn + `deepMerge`). A default reader
  would serve exactly one caller — a hypothetical seam, not a real one.
- **Deletion test moves complexity, doesn't concentrate it.** Deleting the
  proposed default makes `dictionaries.ts` re-add a single line. The seo shim
  cannot collapse into it at all. Nothing concentrates.
- **Simplicity first.** The change trades a one-line removal for a new optional
  `namespace` param plus a default branch the factory must carry and document —
  net more interface surface, not less. That is the over-abstraction this
  project's rules guard against.
- **The injected reader is the right shape.** `readDbLayer` already lets each
  namespace own its db-shaping at the correct seam; the seo shim's warn/lift/merge
  is exactly the kind of per-namespace logic that belongs behind that injection.

## Consequences

- `layered-locale-content.ts`, `dictionaries.ts`, and `seo-content.ts` stay as-is.
  Future architecture reviews should not re-suggest a `namespace`-default reader.
- Reopen if a **third** consumer appears whose `readDbLayer` is the same trivial
  `settings?.[ns]?.[locale]` extraction — two identical trivial adapters would
  make the default a real seam and change the leverage calculus.
