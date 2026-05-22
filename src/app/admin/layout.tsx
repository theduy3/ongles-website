import type { Metadata } from "next";
import "../globals.css";

// Separate root layout for the owner-only admin branch (sibling to [lang]).
// It is intentionally minimal and un-localized, and kept out of search engines.
export const metadata: Metadata = {
  title: "Popup admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-fog text-espresso">{children}</body>
    </html>
  );
}
