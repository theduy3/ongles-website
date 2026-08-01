import { LeaderboardWidget } from "@/components/LeaderboardWidget";

// Standalone, un-localized employee-of-the-month leaderboard for a TV/monitor.
// The embed is fixed to Ongles Maily, so rendering must not depend on the
// optional Supabase settings layer being reachable.
export default function LeaderboardPage() {
  return <LeaderboardWidget />;
}
