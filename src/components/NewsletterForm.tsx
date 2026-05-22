"use client";

import { useState, type FormEvent } from "react";
import type { Dictionary } from "@/lib/dictionary";

type Status = "idle" | "submitting" | "success" | "error";

// Footer email-capture form. Posts to /api/newsletter, which persists to
// Supabase when configured and degrades gracefully otherwise.
export function NewsletterForm({
  dict,
}: {
  dict: Pick<Dictionary, "newsletter">;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const n = dict.newsletter;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(new FormData(form).get("email") ?? "");
    setStatus("submitting");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json()) as { success: boolean };
      if (!res.ok || !json.success) throw new Error();
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return <p className="text-sm leading-relaxed text-cream/80">{n.success}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex items-stretch">
      <input
        type="email"
        name="email"
        required
        placeholder={n.placeholder}
        aria-label={n.placeholder}
        className="min-w-0 flex-1 border-b border-cream/25 bg-transparent px-1 py-2.5 text-sm text-cream outline-none placeholder:text-cream/40 focus:border-cream"
      />
      <button
        type="submit"
        disabled={status === "submitting"}
        className="ml-3 shrink-0 bg-gold px-6 py-2.5 text-xs font-semibold uppercase tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {n.button}
      </button>
      {status === "error" && (
        <p className="mt-2 text-sm text-red-300">{n.error}</p>
      )}
    </form>
  );
}
