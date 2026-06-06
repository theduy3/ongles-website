import { isLocale } from "@/lib/i18n";

// Canonical route keys used for per-page custom-code targeting. "*" matches all
// pages. Single source of truth so the admin editor and the injector agree.
export const ROUTE_KEYS = [
  "home",
  "about",
  "services",
  "gallery",
  "locations",
  "reviews",
  "faq",
  "contact",
  "book-online",
  "appointments",
  "privacy",
  "terms",
] as const;

export type RouteKey = (typeof ROUTE_KEYS)[number];

// Map a Next.js pathname (locale-prefixed, e.g. "/en/services/gel") to a route
// key. The locale segment is dropped; the first remaining segment is the key;
// an empty path ("/en" or "/") collapses to "home". Service detail pages
// (/[lang]/services/[slug]) collapse to "services".
export function routeKeyFromPathname(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && isLocale(segments[0])) segments.shift();
  return segments[0] ?? "home";
}

// True when a snippet targeting `pages` should render on the page `key`.
export function snippetMatchesKey(pages: string[], key: string): boolean {
  return pages.includes("*") || pages.includes(key);
}
