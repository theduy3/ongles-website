# ADR 0007 — admin write handlers collapse into adminWrite, behind a pure core

- **Status:** Accepted
- **Date:** 2026-07-02
- **Context module:** Presentation / admin API routes (see `CONTEXT.md`)

## Context

The three admin write handlers — `settings` PUT, `popups` POST, `popups/[id]`
PUT — each hand-sequenced the same ceremony:

```
guard() → parse json (400 on fail) → schema.safeParse (422 on fail)
        → store call → storeError (503/502) | success envelope (200)
```

The leaf helpers (`guard`, `storeError`, `badRequest`) already lived in
`admin-http.ts`, but the *orchestration* — and the status-code contract it
encodes — was copy-pasted three times and **had no tests**.

## Decision

Add `adminWrite(schema, run)` to `admin-http.ts`, split into two parts:

- **`respondToWrite(request, schema, run, ctx)`** — the pure, auth-free core.
  Owns the status-code contract: invalid JSON→400, schema fail→422, run
  `invalid`→422, store `not_configured`→503, `failed`→502, ok→200.
- **`adminWrite(schema, run)`** — `guard()` then `respondToWrite`. Used as a
  route export: `export const PUT = adminWrite(Schema, run)`.

`run(data, ctx) → AdminWriteResult<T>` absorbs the per-route variation: the
store call, any success side effect (settings PUT's `revalidateStoreCaches`),
and any pre-store check (popups/[id] PUT's body-vs-URL id match, returned as
`{ ok:false, reason:"invalid", detail }` → 422).

## Rationale

- **Deepens, not just DRYs.** The win is not fewer lines — it is one interface
  that is the single **test surface** for the status-code policy. `respondToWrite`
  is now unit-tested across the full matrix (`admin-http.test.ts`); the routes
  had zero coverage before.
- **No knob-bag.** Rejected a single `createAdminRoute({getter?, poster?,
  deleter?, onSuccess?, check?})` — a wide optional-config interface nearly as
  complex as the handlers it replaces (shallow). `run` carries the variation
  instead, so the factory interface stays two arguments.
- **Consistent with ADR 0003.** The pure decision (`respondToWrite`) is tested;
  the framework edge (`guard`/`isAuthed`, session IO) stays the thin untested
  shell — the same split as store IO. Testing it would mean mocking
  `@/lib/session`, which risks the known `mock.module` global-contamination trap.
- **Scope is the write path only.** GET (read) and `popups/[id]` DELETE (param
  action) are 2 lines of ceremony each; a helper for them saves little and risks
  shallowness. Left inline.
- **`export const PUT = adminWrite(...)` works.** Verified via `next build` — a
  `const` route export is a named ESM export and Next detects it like a function
  declaration (same basis as ADR 0006's `generateMetadata` re-export).

## Consequences

- `admin-http.ts` gains `AdminWriteResult`, `respondToWrite`, `adminWrite`; the
  three write handlers become one-liners delegating to `run`.
- Future reviews should **not** fold read/action handlers into the factory
  without a real duplication signal, nor add tests for the `guard` edge.
- `login` (no guard — the auth endpoint) and `upload` (multipart + file
  validation, not JSON) are deliberately outside this seam.
