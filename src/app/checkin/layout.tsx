import type { Metadata } from "next";
import "../globals.css";

// Standalone root layout for the un-localized /checkin kiosk page (sibling to
// [lang] and admin). Intentionally minimal — no Header/Footer/popups — and kept
// out of search engines.
export const metadata: Metadata = {
  title: "Check in",
  robots: { index: false, follow: false },
};

export default function CheckinLayout({
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
