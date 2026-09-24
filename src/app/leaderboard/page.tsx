import { LeaderboardWidget } from "@/components/LeaderboardWidget";
import { getStoreConfig } from "@/lib/store-config";

// Standalone, un-localized employee-of-the-month leaderboard for a TV/monitor.
// The minimal noindex shell comes from layout.tsx.
export default async function LeaderboardPage() {
  const { site } = await getStoreConfig();
  return (
    <LeaderboardWidget storeId={site.storeId} widgetHost={site.widgetHost} />
  );
}
