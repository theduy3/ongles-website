#!/usr/bin/env bash
# Integration-test runner for the store IO shell's tenant scoping (ADR 0009).
#
# Boots a LOCAL Supabase, applies migrations, injects its env under the names the
# app reads, pins the active tenant, and runs tests/integration/ — the suite that
# proves `.eq("tenant_id")` isolates one branded site from another against a real
# database. Never runs in the hermetic `bun test src/` unit path.
#
# Requires: Docker running + the supabase CLI. Safe to run repeatedly.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ starting local Supabase (idempotent)…"
supabase start >/dev/null 2>&1 || supabase start

echo "→ applying migrations to a clean local DB…"
supabase db reset >/dev/null

# Map the CLI's status env (API_URL / ANON_KEY / SERVICE_ROLE_KEY) onto the names
# the app reads (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY).
echo "→ resolving local keys…"
eval "$(supabase status -o env)"
export SUPABASE_URL="${API_URL:?supabase status did not report API_URL}"
export SUPABASE_ANON_KEY="${ANON_KEY:?supabase status did not report ANON_KEY}"
export SUPABASE_SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY:?supabase status did not report SERVICE_ROLE_KEY}"

# Do NOT set SUPABASE_TENANT_JWT — the read-scoping test exercises the anon
# fallback path, where our `.eq("tenant_id")` (not RLS) does the isolation.
unset SUPABASE_TENANT_JWT || true

# Pin the active tenant the store modules bind at import.
export TENANT="ongles-maily"

echo "→ running integration suite (TENANT=$TENANT, $SUPABASE_URL)…"
bun test tests/integration/
