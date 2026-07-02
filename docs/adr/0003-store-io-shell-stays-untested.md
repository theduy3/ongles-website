# ADR 0003 — store IO shell stays untested (no gateway seam)

- **Status:** Accepted
- **Date:** 2026-07-01
- **Context module:** Store read resolution (see `CONTEXT.md`)

## Context

`store-settings-store.ts` splits every Supabase access into two parts: a pure
response→value **decision** (`resolvePublicRead` / `resolveAdminRead`, unit-tested
through plain `{ data, error }` data) and an **IO shell** that fetches, e.g.:

```ts
const res = await client
  .from(STORE_SETTINGS_TABLE)
  .select("doc")
  .eq("tenant_id", tenant.id)
  .maybeSingle<Row>();
return resolvePublicRead(res, tenant.id);
```

The fluent query chain (table, `.select`, `.eq("tenant_id", …)` scoping,
`.maybeSingle`) is not unit-tested. `CONTEXT.md` records this as "query wiring
stays in the untested shell."

An architecture review (`/improve-codebase-architecture`, 2026-07-01, Candidate 4,
Speculative) flagged the untested wiring — the cross-tenant risk if `tenant_id`
scoping is wrong — and proposed injecting a `StoreSettingsGateway` port (real
Supabase adapter in prod, fake in tests) so the wiring crosses a testable seam.

## Decision

**Keep the IO shell as-is. Do not introduce a gateway/injection seam to unit-test
the query wiring.**

## Rationale

- **Injection relocates the untested surface, it doesn't shrink it.** A gateway
  moves `.from().select().eq().maybeSingle()` into a thinner adapter that is
  *still* untested. The fluent chain can only be exercised by a fake client that
  mimics the builder — at which point the test asserts the **mock's** recorded
  `.eq` arguments, i.e. it tests the mock, not the query. Deletion test: deleting
  the gateway makes the same chain reappear in the shell — complexity moves, does
  not concentrate.
- **One adapter = hypothetical seam.** The only real adapter is Supabase; the fake
  would exist solely to satisfy a test. Per the project's seam discipline, one
  adapter does not justify a seam.
- **Real coverage needs an integration test, not a refactor.** The only honest way
  to cover the query chain (and the genuine cross-tenant risk) is an integration
  test against a real/local Supabase — a separate test-infra investment, not a
  module deepening. That risk is further mitigated for public reads by per-tenant
  JWT + RLS (`supabase.ts`); admin reads/writes (service-role, RLS-bypassing) are
  the only path relying solely on `.eq`, and only an integration test covers them.
- **`mock.module` is process-global here.** Bun's `mock.module` leaks across the
  suite (see project memory: sibling store-config mocks contaminate unrelated
  tests). A client-mock strategy would have to solve that first, for coverage that
  tests the mock anyway.

## Consequences

- `store-settings-store.ts` stays as pure-decision + untested IO shell. Future
  architecture reviews should not re-suggest a gateway/injection seam for it.
- If genuine coverage of `tenant_id` scoping becomes a priority (e.g. a second
  RLS-bypassing write path, or a cross-tenant incident), add a Supabase
  **integration test** for admin read/write scoping — reopen this ADR under that
  framing, not as a unit-test refactor.
