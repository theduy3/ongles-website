import { NextResponse } from "next/server";
import { PopupSchema } from "@/lib/popup";
import { guard, storeError, badRequest } from "@/lib/admin-http";
import { listPopups, upsertPopup } from "@/lib/popups-store";

// GET: list every popup (active or not) for the editor.
// POST: create or replace a popup (upsert by id).

export async function GET() {
  const denied = await guard();
  if (denied) return denied;

  const result = await listPopups();
  if (!result.ok) return storeError(result);
  return NextResponse.json({ success: true, data: result.data });
}

export async function POST(request: Request) {
  const denied = await guard();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid request body", 400);
  }

  const parsed = PopupSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid popup");
  }

  const result = await upsertPopup(parsed.data);
  if (!result.ok) return storeError(result);
  return NextResponse.json({ success: true, data: result.data });
}
