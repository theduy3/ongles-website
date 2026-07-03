import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Derived presenter-bypass tripwire — one guard over EVERY page.tsx.
//
// CONTEXT.md: "The formatting between fetch and render is owned by presenters,
// not inlined per page." The divergence a presenter prevents is a real defect:
// the home and service pages once formatted the same rating two ways, and the
// /reviews page inlined `toLocaleString("en-CA", …)` — pinning the locale to
// en-CA so FR rendered "4.9" instead of "4,9", the exact divergence the
// formatRating / trustSignals presenters exist to prevent.
//
// That regression was previously guarded by a per-page source assertion copied
// into each `*.trust-signals.test.ts`. Copied guards don't cover the page that
// hasn't been copied into yet — the negative invariant lived on ONE of ~19
// pages. This module DERIVES its coverage from the filesystem instead of
// re-listing it: walk every page.tsx and assert none reintroduces a hardcoded
// locale in a number format. A new page is covered the moment it exists.
//
// Positive, per-page facts (formatFromPrice present, trust.show gate flows)
// stay in each page's own trust-signals tripwire — those are local truths, not
// a shared invariant.

// The defect was `toLocaleString("en-CA", …)`. Any BCP-47-style language tag
// literal (`"en-CA"`, `'fr-CA'`) passed as the first arg pins the locale and
// reintroduces the divergence; page-level formatting must be locale-aware via a
// presenter, which uses `${lang}-CA`. Template-literal args (what presenters
// use) are not string literals and are not matched.
const HARDCODED_LOCALE = /toLocaleString\(\s*["'][a-z]{2}-[A-Z]{2}["']/;

// This file lives in src/app/[lang]; its own directory is the [lang] route root.
const langRoot = fileURLToPath(new URL(".", import.meta.url));
const pages = collectPages(langRoot).sort();

describe("presenter-bypass tripwire — no page hardcodes a number-format locale", () => {
  test("the walk actually finds the page.tsx files (guard is not vacuous)", () => {
    // If the walk silently matched nothing, every assertion below would pass
    // for the wrong reason. Anchor the expectation to the real page count.
    expect(pages.length).toBeGreaterThanOrEqual(15);
  });

  for (const page of pages) {
    const rel = page.slice(page.indexOf("src/"));
    test(`${rel} routes number formatting through a presenter (no hardcoded locale)`, () => {
      const offending = readFileSync(page, "utf8")
        .split("\n")
        .map((line, i) => ({ line: line.trim(), n: i + 1 }))
        .filter(({ line }) => HARDCODED_LOCALE.test(line));

      if (offending.length > 0) {
        const where = offending.map((o) => `  L${o.n}: ${o.line}`).join("\n");
        throw new Error(
          `${rel} inlines a hardcoded-locale toLocaleString — route this ` +
            `through a presenter (formatRating / formatReviewCount / trustSignals):\n${where}`,
        );
      }
      expect(offending.length).toBe(0);
    });
  }
});

/** Recursively collect every `page.tsx` under `dir` (absolute paths). */
function collectPages(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}${entry.name}`;
    if (entry.isDirectory()) out.push(...collectPages(`${full}/`));
    else if (entry.name === "page.tsx") out.push(full);
  }
  return out;
}
