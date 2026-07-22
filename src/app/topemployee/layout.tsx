import type { Metadata } from "next";
import "../globals.css";

// Keep this standalone route request-rendered without depending on the
// Supabase-backed runtime settings layer.
export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return {
    title: "Top employee",
    robots: { index: false, follow: false },
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
