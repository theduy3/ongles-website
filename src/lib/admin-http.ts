import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/session";

// Shared helpers for the admin API route handlers.

// Defense-in-depth auth check (proxy.ts also gates these paths). Returns a 401
// response when not authenticated, or null to proceed.
export async function guard(): Promise<NextResponse | null> {
  if (await isAuthed()) return null;
  return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
}

type StoreFailure = { reason: "not_configured" } | { reason: "failed"; detail: string };

// Map a store-layer failure to an HTTP response (mirrors the contact route's
// loud-failure policy: never silently swallow).
export function storeError(failure: StoreFailure): NextResponse {
  if (failure.reason === "not_configured") {
    return NextResponse.json(
      { success: false, error: "Popup storage is not configured." },
      { status: 503 },
    );
  }
  console.error("[admin] store operation failed:", failure.detail);
  return NextResponse.json(
    { success: false, error: "Storage operation failed. Please try again." },
    { status: 502 },
  );
}

export function badRequest(message: string, status = 422): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status });
}
