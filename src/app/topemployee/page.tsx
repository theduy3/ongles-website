import { TopEmployeeWidget } from "@/components/TopEmployeeWidget";

// Standalone, un-localized employee-of-the-month board for a TV/monitor.
// The embed is fixed to Ongles Maily, so rendering must not depend on the
// optional Supabase settings layer being reachable.
export default function TopEmployeePage() {
  return <TopEmployeeWidget />;
}
