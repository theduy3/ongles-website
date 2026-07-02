import { NextResponse } from "next/server";
import type { z } from "zod";
import { isAuthed } from "@/lib/session";
import type { StoreResult } from "@/lib/tenant-store";

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

// The outcome of an admin write's `run` callback: the store envelope, plus one
// extra case — the request was well-formed JSON that passed the schema but is
// still invalid against state the schema can't see (e.g. a URL/body id mismatch).
// That pre-store rejection maps to 422, alongside the store outcomes.
export type AdminWriteResult<T> =
  | StoreResult<T>
  | { ok: false; reason: "invalid"; detail: string };

// Pure core of an admin write: auth-free so the whole status matrix is
// unit-testable without a session. Owns the one status-code contract that was
// triplicated across the admin routes:
//   invalid JSON      → 400
//   schema failure    → 422
//   run "invalid"     → 422
//   store not_configured → 503
//   store failed      → 502
//   ok                → 200
// The per-route parts (which schema, what the store call does, any pre-store
// check or success side effect) live in `run`; this owns the invariant policy.
export async function respondToWrite<T, C>(
  request: Request,
  schema: z.ZodType<T>,
  run: (data: T, ctx: C) => Promise<AdminWriteResult<T>>,
  ctx: C,
): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid request body", 400);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
  }

  const result = await run(parsed.data, ctx);
  if (result.ok) {
    return NextResponse.json({ success: true, data: result.data });
  }
  if (result.reason === "invalid") {
    return badRequest(result.detail);
  }
  return storeError(result);
}

// Admin write handler: the thin framework edge (guard) wrapping the pure core.
// Use as a Next route export: `export const PUT = adminWrite(Schema, run)`.
export function adminWrite<T, C>(
  schema: z.ZodType<T>,
  run: (data: T, ctx: C) => Promise<AdminWriteResult<T>>,
): (request: Request, ctx: C) => Promise<NextResponse> {
  return async (request, ctx) => {
    const denied = await guard();
    if (denied) return denied;
    return respondToWrite(request, schema, run, ctx);
  };
}
