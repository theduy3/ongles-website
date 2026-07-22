import type { Metadata } from "next";
import "../globals.css";
import { getStoreConfig } from "@/lib/store-config";

// Resolve tenant-specific metadata at runtime because the same image is used
// by multiple containers with different TENANT values.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getStoreConfig();
  return {
    title: "Top employee",
    robots: { index: false, follow: false },
    ...(site.favicon ? { icons: { icon: site.favicon } } : {}),
  };
}

export default function TopEmployeeLayout({
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
