import type { Metadata } from "next";
import "../globals.css";
import { getStoreConfig } from "@/lib/store-config";

// Separate root layout for the owner-only admin branch (sibling to [lang]).
// It is intentionally minimal and un-localized, and kept out of search engines.
// Async so it can resolve the active tenant's favicon (getStoreConfig is keyed
// on tenant.id, not locale) — mirrors the public [lang]/layout.tsx pattern.
//
// force-dynamic: one universal image serves every tenant (TENANT set per
// container at runtime). Without this, Next prerenders the route statically and
// bakes the build-time tenant's favicon into the HTML — the bug we're fixing.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getStoreConfig();
  return {
    title: "Popup admin",
    robots: { index: false, follow: false },
    ...(site.favicon ? { icons: { icon: site.favicon } } : {}),
  };
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-fog text-espresso">{children}</body>
    </html>
  );
}
