import { NextResponse } from "next/server";
import { PopupSchema } from "@/lib/popup";
import { guard, storeError, adminWrite } from "@/lib/admin-http";
import { deletePopup, upsertPopup } from "@/lib/popups-store";

// PUT: update an existing popup. DELETE: remove it. The route param is the
// canonical id; the body id must match it.

type Ctx = { params: Promise<{ id: string }> };

export const PUT = adminWrite(PopupSchema, async (data, ctx: Ctx) => {
  const { id } = await ctx.params;
  if (data.id !== id) {
    return {
      ok: false,
      reason: "invalid" as const,
      detail: "Popup id in body does not match the URL",
    };
  }
  return upsertPopup(data);
});

export async function DELETE(_request: Request, ctx: Ctx) {
  const denied = await guard();
  if (denied) return denied;

  const { id } = await ctx.params;
  const result = await deletePopup(id);
  if (!result.ok) return storeError(result);
  return NextResponse.json({ success: true, data: result.data });
}
