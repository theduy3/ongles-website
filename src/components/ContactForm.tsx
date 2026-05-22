"use client";

import { useState, type FormEvent } from "react";
import type { Dictionary } from "@/lib/dictionary";

type Status = "idle" | "submitting" | "success" | "error";

const fieldClass =
  "w-full border-b border-espresso/30 bg-transparent py-2 text-espresso outline-none placeholder:text-espresso/40 focus:border-espresso";

// Client Component — manages submit lifecycle and posts to /api/contact.
// All visible copy comes from the active locale's dictionary.
export function ContactForm({ dict }: { dict: Pick<Dictionary, "form" | "cta"> }) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("submitting");
    setError("");

    try {
      const payload = Object.fromEntries(new FormData(form));
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Something went wrong. Please try again.");
      }
      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "success") {
    return <p className="text-lg text-mocha">{dict.form.success}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-mocha">
        {dict.form.firstName}
        <input name="firstName" required className={fieldClass} />
      </label>
      <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-mocha">
        {dict.form.lastName}
        <input name="lastName" required className={fieldClass} />
      </label>
      <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-mocha sm:col-span-2">
        {dict.form.email}
        <input type="email" name="email" required className={fieldClass} />
      </label>
      <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-mocha sm:col-span-2">
        {dict.form.message}
        <textarea name="message" required rows={4} className={fieldClass} />
      </label>

      {status === "error" && <p className="text-sm text-red-700 sm:col-span-2">{error}</p>}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="inline-flex w-fit items-center justify-center rounded-pill bg-espresso px-8 py-3 text-sm font-semibold uppercase tracking-wide text-cream transition-colors hover:bg-mocha disabled:opacity-60"
      >
        {status === "submitting" ? dict.cta.sending : dict.cta.send}
      </button>
    </form>
  );
}
