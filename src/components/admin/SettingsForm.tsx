"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { StoreSettings } from "@/lib/store-settings-schema";
import {
  buildSparseDoc,
  extractSeo,
  emptySeoDraft,
  type SeoDraft,
  type SettingsDraftState,
} from "@/lib/settings-draft";
import { BrandSeoSection } from "./settings/BrandSeoSection";
import { SeoSection } from "./settings/SeoSection";
import { ContactHoursSection } from "./settings/ContactHoursSection";
import { BookingServicesSection } from "./settings/BookingServicesSection";

function emptyState(): SettingsDraftState {
  return { site: {}, services: [], seoFr: emptySeoDraft(), seoEn: emptySeoDraft() };
}

function stateFromSettings(s: StoreSettings | null): SettingsDraftState {
  if (!s) return emptyState();
  return {
    site: s.site ?? {},
    services: s.services ?? [],
    seoFr: extractSeo(s.seo?.fr as Record<string, unknown> | undefined),
    seoEn: extractSeo(s.seo?.en as Record<string, unknown> | undefined),
  };
}

export function SettingsForm({
  storeName,
  tenantId,
}: {
  storeName: string;
  tenantId: string;
}) {
  const [draft, setDraft] = useState<SettingsDraftState>(emptyState());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (data.success) {
          setDraft(stateFromSettings(data.data as StoreSettings | null));
        } else {
          setError(data.error ?? "Failed to load settings");
        }
      })
      .catch(() => setError("Network error loading settings"))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function patchSite(patch: Partial<NonNullable<StoreSettings["site"]>>) {
    setDraft((prev) => ({ ...prev, site: { ...prev.site, ...patch } }));
    setSaved(false);
  }

  function setServices(next: NonNullable<StoreSettings["services"]>) {
    setDraft((prev) => ({ ...prev, services: next }));
    setSaved(false);
  }

  function setSeoFr(next: SeoDraft) {
    setDraft((prev) => ({ ...prev, seoFr: next }));
    setSaved(false);
  }

  function setSeoEn(next: SeoDraft) {
    setDraft((prev) => ({ ...prev, seoEn: next }));
    setSaved(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const body = buildSparseDoc(draft);
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaved(true);
      } else {
        setError(data.error ?? "Save failed");
      }
    } catch {
      setError("Network error while saving");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl">Store settings</h1>
          <p className="mt-1 text-xs text-tan">
            Configuring store: {storeName} — {tenantId}
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-pill border border-tan px-4 py-2 text-sm"
        >
          ← Back
        </Link>
      </header>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {saved && (
        <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Settings saved. Changes are live after revalidation.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-tan">Loading…</p>
      ) : (
        <form onSubmit={save} className="flex flex-col gap-6">
          <BrandSeoSection site={draft.site} onSiteChange={patchSite} />
          <SeoSection
            seoFr={draft.seoFr}
            seoEn={draft.seoEn}
            onSeoFrChange={setSeoFr}
            onSeoEnChange={setSeoEn}
          />
          <ContactHoursSection site={draft.site} onSiteChange={patchSite} />
          <BookingServicesSection
            site={draft.site}
            services={draft.services}
            onSiteChange={patchSite}
            onServicesChange={setServices}
          />

          <div className="flex gap-2 pb-8">
            <button
              type="submit"
              disabled={saving}
              className="rounded-pill bg-espresso px-4 py-2 text-sm text-cream disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
            <Link
              href="/admin"
              className="rounded-pill border border-tan px-4 py-2 text-sm"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}
    </main>
  );
}
