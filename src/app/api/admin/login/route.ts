import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, isAuthConfigured, verifyPassword } from "@/lib/session";

// POST: exchange the owner password for a sealed session cookie.
// DELETE: log out (destroy the session). This route is allowlisted in proxy.ts
// so it stays reachable while unauthenticated.

const LoginSchema = z.object({ password: z.string().min(1) });

export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { success: false, error: "Admin login is not configured." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Password is required" }, { status: 422 });
  }

  if (!verifyPassword(parsed.data.password)) {
    return NextResponse.json({ success: false, error: "Incorrect password" }, { status: 401 });
  }

  const session = await getSession();
  session.authed = true;
  await session.save();
  return NextResponse.json({ success: true });
}

export async function DELETE() {
  if (!isAuthConfigured()) {
    return NextResponse.json({ success: true });
  }
  const session = await getSession();
  session.destroy();
  return NextResponse.json({ success: true });
}
