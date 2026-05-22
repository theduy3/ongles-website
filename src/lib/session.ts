import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";

// Single-owner admin auth: one password (ADMIN_PASSWORD) unlocks a sealed,
// HTTP-only cookie session (sealed with ADMIN_SESSION_SECRET via iron-session).
// There are no user accounts — this gates the popup editor for the salon owner.

export type SessionData = { authed?: boolean };

export const SESSION_COOKIE = "bn_admin";

const sessionSecret = process.env.ADMIN_SESSION_SECRET ?? "";
const adminPassword = process.env.ADMIN_PASSWORD ?? "";

export const sessionOptions: SessionOptions = {
  cookieName: SESSION_COOKIE,
  password: sessionSecret,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  },
};

// True only when both secrets are present and the seal key meets iron-session's
// 32-char minimum. The admin surface returns 503 when this is false.
export function isAuthConfigured(): boolean {
  return adminPassword.length > 0 && sessionSecret.length >= 32;
}

// Constant-time comparison over SHA-256 digests so neither the password value
// nor its length leaks through timing.
export function verifyPassword(input: string): boolean {
  if (!isAuthConfigured()) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(adminPassword).digest();
  return timingSafeEqual(a, b);
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

// Guard for admin route handlers — defense-in-depth alongside proxy.ts, per the
// Next.js data-security guidance to verify auth inside handlers too.
export async function isAuthed(): Promise<boolean> {
  if (!isAuthConfigured()) return false;
  const session = await getSession();
  return session.authed === true;
}
