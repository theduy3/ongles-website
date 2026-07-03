# ADR 0009 — store IO shell gets integration coverage (reopens 0003)

- **Status:** Accepted
- **Date:** 2026-07-02
- **Context module:** Store read resolution (see `CONTEXT.md`)
- **Relates to:** ADR 0003 (store IO shell stays untested — no gateway seam)

## Context

ADR 0003 kept the store IO shell's query wiring (`.from().select()
.eq("tenant_id", …).maybeSingle()`) unit-untested and rejected a gateway/fake-
client seam — a fake only tests the mock's recorded `.eq` arguments, and Bun's
`mock.module` leaks process-globally. It named the explicit reopen trigger:

> If genuine coverage of `tenant_id` scoping becomes a priority (e.g. a second
> RLS-bypassing write path, or a cross-tenant incident), add a Supabase
> **integration test** for admin read/write scoping — reopen this ADR under that
> framing, not as a unit-test refactor.

Both halves of that trigger now hold:

- **A second RLS-bypassing write path landed.** ADR 0007 (2026-07-02) formalized
  the popups admin writes (`upsertPopup`, `deletePopup`) alongside store-settings
  — a second family of service-role, RLS-bypassing mutations. There are now six
  `.eq("tenant_id", …)` sites across `popups-store.ts` and
  `store-settings-store.ts`.
- **The risk is concrete.** `popups-store.ts` `deletePopup(id)` is
  `.delete().eq("id", id).eq("tenant_id", tenant.id)`. `popups.id` is a GLOBAL
  primary key, so dropping the `tenant_id` clause would let one branded site
  delete another site's popup by id. That is a cross-tenant data-loss defect, not
  a hypothetical.

## Decision

**Add a Supabase integration test — do NOT revisit the gateway/fake-client
seam.** ADR 0003's rejection of injection stands; this is the integration-test
investment 0003 pointed to.

- `tests/integration/tenant-scoping.integration.test.ts` seeds two tenants into a
  real local Supabase and exercises the REAL query chains through the store
  functions, asserting the admin (RLS-bypassing) paths isolate by tenant:
  - `deletePopup` cannot delete another tenant's popup by id (the headline).
  - `deletePopup` still removes the active tenant's own popup (not a no-op).
  - `listPopups` returns only the active tenant's rows.
  - `upsertPopup` / `upsertStoreSettings` stamp the active tenant and cannot
    reach another tenant's row.
  - `getStoreSettings` reads only the active tenant's singleton.
- Lives under `tests/` — NOT `src/` — so the hermetic `bun test src/` unit run
  never needs a database. Run via `bun run test:integration`
  (`scripts/test-integration.sh`: `supabase start` + `db reset` + inject local
  keys + `TENANT=ongles-maily`).
- A hard safety guard skips the whole suite unless `SUPABASE_URL` is localhost,
  so it can never touch a remote/prod project.

## Rationale

- **Tests the query, not a mock.** The chain runs against Postgres, so a wrong or
  missing `.eq("tenant_id")` fails the test — proven by temporarily deleting the
  clause (the isolation test went red).
- **Scoped to the real untested surface.** The public anon read path is left to
  RLS + per-tenant JWT (as ADR 0003 already noted); this suite pins only the
  admin, RLS-bypassing paths — the ones that rely on `.eq` alone.
- **No new production seam.** No gateway, no injection, no fake client. The store
  modules are unchanged; the coverage is external and opt-in.

## Consequences

- `store-settings-store.ts` / `popups-store.ts` stay as pure-decision + IO shell;
  their tenant scoping is now covered by an integration suite instead of "e2e/
  prod only."
- The integration suite needs Docker + the supabase CLI; it is intentionally out
  of the default `bun test src/` path and out of any hook/CI that lacks them.
- ADR 0003's ban on a gateway/fake-client seam remains in force.
