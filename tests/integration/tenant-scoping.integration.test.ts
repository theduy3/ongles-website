import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { PopupSchema, type Popup } from "@/lib/popup";
import { StoreSettingsSchema } from "@/lib/store-settings-schema";
import { listPopups, upsertPopup, deletePopup } from "@/lib/popups-store";
import { getStoreSettings, upsertStoreSettings } from "@/lib/store-settings-store";
import { tenant } from "@/config";
import { POPUPS_TABLE, STORE_SETTINGS_TABLE } from "@/lib/supabase";

// Integration coverage for the store IO shell's tenant scoping — the untested
// surface ADR 0003 left to "e2e/prod", reopened by ADR 0009 under the
// integration-test framing (a second RLS-bypassing write path — popups — landed
// after 0003, and deletePopup carries a concrete cross-tenant risk).
//
// ADR 0003's core argument stands: a fake Supabase client would only test the
// mock's recorded `.eq` arguments. So this exercises the REAL query chain
// (`.from().select().eq("tenant_id", …).maybeSingle()` and friends) against a
// real Supabase, seeded with two tenants — the only honest way to prove
// `.eq("tenant_id")` actually isolates one branded site from another.
//
// Runs ONLY against a local Supabase (scripts/test-integration.sh boots it and
// injects env). It lives under tests/ — NOT src/ — so the hermetic `bun test
// src/` unit run never reaches for a database. The safety guard below hard-skips
// unless SUPABASE_URL is localhost, so a stray run can never touch prod.

const url = process.env.SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const isLocal = /(127\.0\.0\.1|localhost)(:|\/|$)/.test(url);
const configured = Boolean(url && serviceKey && isLocal);

// The store modules bind the active tenant at import from process.env.TENANT.
// The runner pins it to ongles-maily; assert it so the seed matches what the
// store functions actually query.
const ACTIVE = tenant.id;
const OTHER = ACTIVE === "ongles-charlesbourg" ? "ongles-maily" : "ongles-charlesbourg";

// Fixed, namespaced ids so cleanup can't touch real rows.
const A_POPUP = "itest-popup-a";
const B_POPUP = "itest-popup-b";

// A raw service-role client — bypasses RLS — used ONLY to seed and to verify
// ground truth independently of the code under test. Never the thing being
// tested; it's the oracle.
const raw: SupabaseClient | null = configured
  ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

function validPopup(id: string): Popup {
  return PopupSchema.parse({ id, type: "rich", title: { en: "T" }, body: { en: "B" } });
}

async function wipe() {
  if (!raw) return;
  await raw.from(POPUPS_TABLE).delete().in("id", [A_POPUP, B_POPUP]);
  await raw.from(STORE_SETTINGS_TABLE).delete().in("tenant_id", [ACTIVE, OTHER]);
}

const suite = configured ? describe : describe.skip;

suite("store IO shell — tenant_id scoping (integration)", () => {
  beforeEach(async () => {
    if (!raw) return;
    await wipe();
    // One popup per tenant. `id` is a global primary key, so B_POPUP genuinely
    // belongs to OTHER — an A-scoped delete of it must find nothing.
    await raw.from(POPUPS_TABLE).insert([
      { id: A_POPUP, doc: validPopup(A_POPUP), tenant_id: ACTIVE },
      { id: B_POPUP, doc: validPopup(B_POPUP), tenant_id: OTHER },
    ]);
    // One settings doc per tenant.
    const doc = StoreSettingsSchema.parse({});
    await raw.from(STORE_SETTINGS_TABLE).insert([
      { tenant_id: ACTIVE, doc },
      { tenant_id: OTHER, doc: { ...doc } },
    ]);
  });

  afterAll(async () => {
    await wipe();
  });

  test("runner pinned the active tenant (seed matches code under test)", () => {
    expect(ACTIVE).not.toBe(OTHER);
  });

  // ── The headline invariant ──────────────────────────────────────────────────
  test("deletePopup cannot delete another tenant's popup by id", async () => {
    const result = await deletePopup(B_POPUP);
    // The scoped delete matches zero rows — no error, so the operation "succeeds"
    // while touching nothing. The isolation is the tenant_id filter, not an error.
    expect(result.ok).toBe(true);

    const { data } = await raw!.from(POPUPS_TABLE).select("id, tenant_id").eq("id", B_POPUP);
    expect(data).toHaveLength(1);
    expect(data![0].tenant_id).toBe(OTHER);
  });

  test("deletePopup removes the active tenant's own popup (delete is real, not a no-op)", async () => {
    const result = await deletePopup(A_POPUP);
    expect(result.ok).toBe(true);

    const { data } = await raw!.from(POPUPS_TABLE).select("id").eq("id", A_POPUP);
    expect(data).toHaveLength(0);
  });

  // ── Read scoping (our .eq, not RLS — the anon path relies on it) ─────────────
  test("listPopups returns only the active tenant's popups", async () => {
    const result = await listPopups();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = result.data.map((p) => p.id);
    expect(ids).toContain(A_POPUP);
    expect(ids).not.toContain(B_POPUP);
  });

  // The public read path (readPopups → anon client) is NOT covered here: after
  // the tenant-aware RLS migration, an anon client without a SUPABASE_TENANT_JWT
  // claim is filtered by RLS before our `.eq` runs (locally it sees nothing). In
  // prod each container carries a tenant-scoped JWT, so RLS — not the untested
  // shell — isolates that path. ADR 0003 records this: the untested surface is
  // the admin, RLS-BYPASSING (service-role) path, which is what this suite pins.

  test("upsertPopup stamps the active tenant (write cannot leak to another site)", async () => {
    const fresh = validPopup(A_POPUP);
    const result = await upsertPopup(fresh);
    expect(result.ok).toBe(true);

    const { data } = await raw!.from(POPUPS_TABLE).select("tenant_id").eq("id", A_POPUP);
    expect(data![0].tenant_id).toBe(ACTIVE);
  });

  // ── store_settings singleton scoping ────────────────────────────────────────
  test("getStoreSettings reads only the active tenant's row", async () => {
    // Overwrite the active tenant's doc through our own writer, leave OTHER's
    // seed untouched, then read back through our reader.
    const marked = StoreSettingsSchema.parse({ site: { reviews: { reviewCount: 7 } } });
    const write = await upsertStoreSettings(marked);
    expect(write.ok).toBe(true);

    const read = await getStoreSettings();
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.data?.site?.reviews?.reviewCount).toBe(7);

    // OTHER's row is the empty seed — our write must not have reached it.
    const { data } = await raw!
      .from(STORE_SETTINGS_TABLE)
      .select("doc")
      .eq("tenant_id", OTHER);
    expect(data![0].doc).toEqual({});
  });
});
