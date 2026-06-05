import { getStoreConfig } from "@/lib/store-config";
import { tenant } from "@/config";
import { SettingsForm } from "@/components/admin/SettingsForm";

// Thin server wrapper: resolves store identity at request time (cannot be done
// in a client component), then delegates all interaction to SettingsForm.
export default async function AdminSettingsPage() {
  const { site } = await getStoreConfig();
  return <SettingsForm storeName={site.name} tenantId={tenant.id} />;
}
