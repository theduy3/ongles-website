import { NextResponse } from "next/server";
import { PopupSchema } from "@/lib/popup";
import { guard, storeError, adminWrite } from "@/lib/admin-http";
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

export const POST = adminWrite(PopupSchema, (data) => upsertPopup(data));
