"use client";

import type { CustomCodeSnippet } from "@/lib/store-settings-schema";
import { ROUTE_KEYS } from "@/lib/route-key";
import { inputClass, labelClass, spanClass } from "./BrandSeoSection";

// Editor for admin-authored custom code snippets. Each snippet has a label, a raw
// HTML/JS body, a placement (head vs end-of-body), a page target set, and an
// enabled flag. Pages: the "All pages" checkbox stores ["*"]; otherwise the
// selected route keys. The injected code runs directly in the page — see the
// warning below; the single store owner is the trusted author.

interface Props {
  snippets: CustomCodeSnippet[];
  onChange: (next: CustomCodeSnippet[]) => void;
}

function newSnippet(): CustomCodeSnippet {
  return {
    id: crypto.randomUUID(),
    label: "",
    code: "",
    placement: "body-end",
    pages: ["*"],
    enabled: true,
  };
}

export function CustomCodeSection({ snippets, onChange }: Props) {
  function patch(id: string, p: Partial<CustomCodeSnippet>) {
    onChange(snippets.map((s) => (s.id === id ? { ...s, ...p } : s)));
  }
  function remove(id: string) {
    onChange(snippets.filter((s) => s.id !== id));
  }
  function togglePage(s: CustomCodeSnippet, key: string, on: boolean) {
    // Selecting a specific page clears the wildcard; clearing all leaves [].
    const without = s.pages.filter((p) => p !== "*" && p !== key);
    patch(s.id, { pages: on ? [...without, key] : without });
  }
  function setAllPages(s: CustomCodeSnippet, on: boolean) {
    patch(s.id, { pages: on ? ["*"] : [] });
  }

  return (
    <fieldset className="rounded-xl border border-fog bg-beige/60 p-4">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-mocha">
        Custom code
      </legend>
      <p className="mt-2 text-xs text-tan">
        Pasted code runs directly in the page (analytics, pixels, chat, embeds).
        Only add code from sources you trust — it has full access to the page.
      </p>

      <div className="mt-4 flex flex-col gap-4">
        {snippets.map((s) => {
          const all = s.pages.includes("*");
          return (
            <div key={s.id} className="rounded-lg border border-tan bg-beige p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelClass}>
                  <span className={spanClass}>Label</span>
                  <input
                    className={inputClass}
                    value={s.label}
                    placeholder="e.g. GA4, Crisp chat"
                    onChange={(e) => patch(s.id, { label: e.target.value })}
                  />
                </label>
                <label className={labelClass}>
                  <span className={spanClass}>Placement</span>
                  <select
                    className={inputClass}
                    value={s.placement}
                    onChange={(e) =>
                      patch(s.id, { placement: e.target.value as CustomCodeSnippet["placement"] })
                    }
                  >
                    <option value="head">Head</option>
                    <option value="body-end">End of body</option>
                  </select>
                </label>
              </div>

              <fieldset className="mt-3">
                <span className={spanClass}>Pages</span>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={all}
                      onChange={(e) => setAllPages(s, e.target.checked)}
                    />
                    All pages
                  </label>
                  {!all &&
                    ROUTE_KEYS.map((key) => (
                      <label key={key} className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={s.pages.includes(key)}
                          onChange={(e) => togglePage(s, key, e.target.checked)}
                        />
                        {key}
                      </label>
                    ))}
                </div>
              </fieldset>

              <label className={`${labelClass} mt-3`}>
                <span className={spanClass}>Code</span>
                <textarea
                  className={`${inputClass} font-mono`}
                  rows={5}
                  value={s.code}
                  onChange={(e) => patch(s.id, { code: e.target.value })}
                />
              </label>

              <div className="mt-3 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={s.enabled}
                    onChange={(e) => patch(s.id, { enabled: e.target.checked })}
                  />
                  Enabled
                </label>
                <button
                  type="button"
                  onClick={() => remove(s.id)}
                  className="rounded-pill border border-tan px-3 py-1 text-xs text-mocha"
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => onChange([...snippets, newSnippet()])}
          className="self-start rounded-pill border border-tan px-4 py-2 text-sm"
        >
          + Add snippet
        </button>
      </div>
    </fieldset>
  );
}
