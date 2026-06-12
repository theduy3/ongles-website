import type { Metadata } from "next";
import "../globals.css";
import { getStoreConfig } from "@/lib/store-config";

// Standalone root layout for the un-localized /clientportal page (sibling to
// [lang], admin and checkin). Intentionally minimal — no Header/Footer/popups —
// and kept out of search engines. Async so it resolves the active tenant's
// favicon (getStoreConfig is keyed on tenant.id, not locale) — mirrors
// checkin/layout.tsx.
//
// force-dynamic: one universal image serves every tenant (TENANT set per
// container at runtime). Without this, Next prerenders the route statically and
// bakes the build-time tenant's favicon into the HTML.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getStoreConfig();
  return {
    title: "Client Portal",
    robots: { index: false, follow: false },
    ...(site.favicon ? { icons: { icon: site.favicon } } : {}),
  };
}

export default function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-fog text-espresso">{children}</body>
    </html>
  );
}
