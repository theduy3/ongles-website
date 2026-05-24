import { CheckinWidget } from "@/components/CheckinWidget";

// Standalone, un-localized check-in kiosk. The minimal noindex shell comes from
// layout.tsx; the SalonX check-in widget renders full-screen here.
export default function CheckinPage() {
  return <CheckinWidget />;
}
