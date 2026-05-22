"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Popup } from "@/lib/popup";
import { emptyDraft, toDraft, toPopup, type Draft } from "@/lib/popup-draft";
import { PopupForm } from "@/components/admin/PopupForm";

type ListResult = { ok: true; data: Popup[] } | { ok: false; error: string };

async function fetchPopups(): Promise<ListResult> {
  try {
    const res = await fetch("/api/admin/popups");
    const data = await res.json();
    if (res.ok && data.success) return { ok: true, data: data.data };
    return { ok: false, error: data.error ?? "Failed to load popups" };
  } catch {
    return { ok: false, error: "Network error loading popups" };
  }
}

export default function AdminPage() {
  const router = useRouter();
  const [popups, setPopups] = useState<Popup[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyList = useCallback((result: ListResult) => {
    if (result.ok) {
      setPopups(result.data);
      setError(null);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  const load = useCallback(async () => {
    applyList(await fetchPopups());
  }, [applyList]);

  // setState happens in the async .then callback, not synchronously in the
  // effect body. Initial `loading` state covers the first render.
  useEffect(() => {
    let active = true;
    fetchPopups().then((result) => {
      if (active) applyList(result);
    });
    return () => {
      active = false;
    };
  }, [applyList]);

  function newPopup() {
    setDraft(emptyDraft());
    setIsNew(true);
    setError(null);
  }

  function editPopup(p: Popup) {
    setDraft(toDraft(p));
    setIsNew(false);
    setError(null);
  }

  async function save() {
    if (!draft) return;
    if (!draft.id.trim()) {
      setError("ID is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const popup = toPopup(draft);
      const res = await fetch(
        isNew
          ? "/api/admin/popups"
          : `/api/admin/popups/${encodeURIComponent(popup.id)}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(popup),
        },
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setDraft(null);
        await load();
      } else {
        setError(data.error ?? "Save failed");
      }
    } catch {
      setError("Network error while saving");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(`Delete popup "${id}"? This cannot be undone.`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/popups/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) await load();
      else setError(data.error ?? "Delete failed");
    } catch {
      setError("Network error while deleting");
    }
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl">Popups</h1>
        <div className="flex gap-2">
          <button
            onClick={newPopup}
            className="rounded-pill bg-espresso px-4 py-2 text-sm text-cream"
          >
            New popup
          </button>
          <button
            onClick={logout}
            className="rounded-pill border border-tan px-4 py-2 text-sm"
          >
            Log out
          </button>
        </div>
      </header>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {draft ? (
        <section className="mb-8 rounded-2xl border border-tan bg-cream p-4">
          <h2 className="mb-4 text-lg">
            {isNew ? "New popup" : `Editing “${draft.id}”`}
          </h2>
          <PopupForm
            draft={draft}
            setDraft={setDraft}
            onSubmit={save}
            onCancel={() => setDraft(null)}
            saving={saving}
            isNew={isNew}
          />
        </section>
      ) : null}

      {loading ? (
        <p className="text-sm text-tan">Loading…</p>
      ) : popups.length === 0 ? (
        <p className="text-sm text-tan">
          No popups yet. Create one with “New popup”.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {popups.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-fog bg-beige px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">{p.id}</p>
                <p className="text-xs text-tan">
                  {p.type} · priority {p.priority} · {p.frequency}
                  {p.endsAt ? ` · ends ${p.endsAt}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => editPopup(p)}
                  className="text-sm underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(p.id)}
                  className="text-sm text-red-600 underline"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
