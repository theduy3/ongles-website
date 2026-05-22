import { NextResponse } from "next/server";
import { PopupSchema } from "@/lib/popup";
import { guard, storeError, badRequest } from "@/lib/admin-http";
import { deletePopup, upsertPopup } from "@/lib/popups-store";

// PUT: update an existing popup. DELETE: remove it. The route param is the
// canonical id; the body id must match it.

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, ctx: Ctx) {
  const denied = await guard();
  if (denied) return denied;

  const { id } = await ctx.params;

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
  if (parsed.data.id !== id) {
    return badRequest("Popup id in body does not match the URL");
  }

  const result = await upsertPopup(parsed.data);
  if (!result.ok) return storeError(result);
  return NextResponse.json({ success: true, data: result.data });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const denied = await guard();
  if (denied) return denied;

  const { id } = await ctx.params;
  const result = await deletePopup(id);
  if (!result.ok) return storeError(result);
  return NextResponse.json({ success: true, data: result.data });
}
