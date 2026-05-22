import { NextResponse, type NextRequest } from "next/server";
import { unsealData } from "iron-session";
import { locales, isLocale, matchLocale } from "@/lib/i18n";

// Proxy is Next.js 16's renamed Middleware. Only one proxy file is supported, so
// it handles two concerns:
//   1. Admin auth gate for /admin/* (pages) and /api/admin/* (API).
//   2. Locale routing for public page routes (add a /{locale} prefix).
// The admin branch returns early so /admin is never locale-prefixed.
const LOCALE_COOKIE = "NEXT_LOCALE";
const SESSION_COOKIE = "bn_admin";
const LOGIN_PATHS = new Set(["/admin/login", "/api/admin/login"]);
const STANDALONE_PATHS = new Set(["/checkin", "/queue"]);

// Kept self-contained (reads + unseals the cookie directly, no shared modules)
// per the proxy guidance. Admin handlers re-check via isAuthed() too.
async function hasValidSession(request: NextRequest): Promise<boolean> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) return false;
  const sealed = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sealed) return false;
  try {
    const data = await unsealData<{ authed?: boolean }>(sealed, {
      password: secret,
    });
    return data.authed === true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Admin surface — auth gate, no locale prefixing.
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (LOGIN_PATHS.has(pathname)) return NextResponse.next();
    if (await hasValidSession(request)) return NextResponse.next();
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // 1b. Standalone, un-localized kiosk pages (check-in, queue). No locale prefix.
  if (STANDALONE_PATHS.has(pathname)) return NextResponse.next();

  // 2. Locale routing for public pages.
  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocale) return NextResponse.next();

  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale =
    cookieLocale && isLocale(cookieLocale)
      ? cookieLocale
      : matchLocale(request.headers.get("accept-language"));

  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  // Page routes (excludes _next, /api, and file paths) get locale handling;
  // /api/admin/* is added explicitly so the admin API is gated too.
  matcher: ["/((?!_next|api|.*\\..*).*)", "/api/admin/:path*"],
};
