// Filesystem-parity guard for STANDALONE_PATHS.
//
// A "standalone" route is an un-localized page that owns its own <html> root layout as a
// sibling of [lang] (kiosk / customer-portal surfaces). The proxy must skip locale-prefixing
// them, so every such route MUST be registered in STANDALONE_PATHS — otherwise it redirects
// to /{locale}/… which has no matching route and 404s.
//
// This scans the app/ tree and fails at CI time the moment a new standalone route is added
// without a manifest entry: the class of bug that shipped twice, as /clientportal (PR #9)
// and /subscription (PR #10).

import { describe, expect, it } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { STANDALONE_PATHS } from "./standalone-routes";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..", "app");

// The two <html>-owning route trees that are deliberately NOT standalone:
//   [lang] — localized; the proxy prefixes it on purpose.
//   admin  — handled by the admin auth branch, which returns before the standalone check.
const NON_STANDALONE = new Set(["[lang]", "admin"]);

/** Directories under app/ whose layout.tsx renders <html> — the standalone signature. */
function standaloneRoutesOnDisk(): string[] {
  return readdirSync(appDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !NON_STANDALONE.has(e.name))
    .filter((e) => {
      try {
        return readFileSync(join(appDir, e.name, "layout.tsx"), "utf8").includes("<html");
      } catch (err) {
        // ONLY a missing layout.tsx means "not a standalone root". Swallowing every
        // error would let a permission or read failure hide a route from the scan, and
        // the parity check below would then pass while protecting nothing — the exact
        // vacuous-green hole the detection test above exists to prevent.
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
        throw err;
      }
    })
    .map((e) => `/${e.name}`)
    .sort();
}

describe("STANDALONE_PATHS parity with the app/ tree", () => {
  it("detects the known standalone routes — proves the scan still works", () => {
    // Without this the guard degrades silently: if the <html> signature ever stops
    // matching, standaloneRoutesOnDisk() returns [] and the parity test below passes
    // vacuously while protecting nothing.
    expect(standaloneRoutesOnDisk()).toEqual([
      "/checkin",
      "/clientportal",
      "/leaderboard",
      "/queue",
      "/subscription",
    ]);
  });

  it("stays in sync with the app/ tree in BOTH directions", () => {
    const onDisk = standaloneRoutesOnDisk();
    const declared = [...STANDALONE_PATHS].sort();

    const missing = onDisk.filter((route) => !STANDALONE_PATHS.has(route));
    if (missing.length > 0) {
      throw new Error(
        `Standalone route(s) ${missing.join(", ")} own an <html> layout but are not in ` +
          `STANDALONE_PATHS (src/lib/standalone-routes.ts). Without an entry the proxy ` +
          `locale-prefixes them and they 404. Add each path to the Set.`,
      );
    }

    // The other direction matters too: a stale entry for a deleted route never fails
    // anything on its own, so the allowlist quietly drifts from the tree it describes
    // and stops being trustworthy as documentation of what is standalone.
    const stale = declared.filter((route) => !onDisk.includes(route));
    if (stale.length > 0) {
      throw new Error(
        `STANDALONE_PATHS lists ${stale.join(", ")}, which own no <html> layout under ` +
          `src/app/. Remove the stale entr${stale.length === 1 ? "y" : "ies"}, or — if a ` +
          `route is deliberately listed without a filesystem layout — carve it out here ` +
          `explicitly so the exception is visible.`,
      );
    }

    expect(onDisk).toEqual(declared);
  });
});
