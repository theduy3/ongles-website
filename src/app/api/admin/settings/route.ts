import { NextResponse } from "next/server";
import { StoreSettingsSchema } from "@/lib/store-settings-schema";
import { guard, storeError, adminWrite } from "@/lib/admin-http";
import { getStoreSettings, upsertStoreSettings } from "@/lib/store-settings-store";
import { revalidateStoreCaches } from "@/lib/revalidate-store-caches";
import { tenant } from "@/config";

// GET: return the current sparse settings override (data may be null = no override yet).
// PUT: validate, upsert, and revalidate cached store config + content.

export async function GET() {
  const denied = await guard();
  if (denied) return denied;

  const result = await getStoreSettings();
  if (!result.ok) return storeError(result);
  return NextResponse.json({ success: true, data: result.data });
}

export const PUT = adminWrite(StoreSettingsSchema, async (data) => {
  const result = await upsertStoreSettings(data);
  if (result.ok) revalidateStoreCaches(tenant.id);
  return result;
});
