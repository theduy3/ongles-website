import { NextResponse } from "next/server";
import { StoreSettingsSchema } from "@/lib/store-settings-schema";
import { guard, storeError, badRequest } from "@/lib/admin-http";
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

export async function PUT(request: Request) {
  const denied = await guard();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid request body", 400);
  }

  const parsed = StoreSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid settings");
  }

  const result = await upsertStoreSettings(parsed.data);
  if (!result.ok) return storeError(result);

  revalidateStoreCaches(tenant.id);

  return NextResponse.json({ success: true, data: result.data });
}
