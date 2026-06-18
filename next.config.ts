import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
// Static import (NOT a dynamic `await import()`). Next's next.config.ts loader
// (next/dist/build/next-config-ts/transpile-config.js) SWC-transforms this file to
// CJS and only registers its `.ts`/`.tsx` require-hook when the compiled code
// contains `require(`. A static import compiles to `require(...)`, which triggers
// the hook and resolves this validator + its transitive `.ts` chain (index.ts →
// tenant dirs) — no tsx/ts-node, works under node:20-alpine (Docker build stage).
// A dynamic `import()` is preserved as native ESM import() and BYPASSES the hook →
// MODULE_NOT_FOUND. Importing here is side-effect-free; validation only runs when
// assertAllTenantsComplete() is called inside the PHASE_PRODUCTION_BUILD guard, so
// `next dev` is never blocked.
import { assertAllTenantsComplete } from "./src/config/config-completeness";

// Baseline security headers applied to every route. These are non-breaking and
// improve the Lighthouse "Best Practices"/trust signals.
//
// NOTE: a Content-Security-Policy is intentionally NOT set here yet. Future CSP
// must allowlist the following origins before enabling:
//   - frame-src https://www.google.com  (Google Maps iframes on /locations)
//   - connect-src for the Ongles Maily booking platform
//     (moo.wyf.mybluehost.me — see site.booker in src/lib/site.ts)
// Validate at runtime before enabling — tracked as a follow-up.
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

// Config-completeness build guard (D-09/D-10).
//
// assertAllTenantsComplete() runs ONLY when phase === PHASE_PRODUCTION_BUILD, so it
// never fires during `next dev` (config is loaded on dev startup too) — configs may
// stay intentionally incomplete while Plan 01-2 data is mid-fill. Throwing here
// propagates through normalizeConfig() to next-build.js .catch() → printAndExit() →
// process.exit(1), aborting the Dokploy deploy on incomplete config.
//
// PHASE_PRODUCTION_BUILD is the Next.js phase constant ('phase-production-build')
// that the framework passes as `phase` for every `next build` — not a custom env var.
export default async function config(phase: string): Promise<NextConfig> {
  if (phase === PHASE_PRODUCTION_BUILD) {
    assertAllTenantsComplete();
  }

  return {
    // Emit a self-contained .next/standalone/server.js for the Docker runtime stage.
    output: "standalone",
    // Drop the `X-Powered-By: Next.js` header — no need to advertise the stack.
    poweredByHeader: false,
    // Pin the workspace root to this project. Without it, Turbopack infers the
    // root from the nearest lockfile and can land on ~/ (a stray package-lock.json),
    // then watches the whole home dir — unrelated writes there trigger phantom HMR
    // recompiles. Anchoring here keeps the file watcher scoped to the project.
    turbopack: { root: __dirname },
    images: {
      remotePatterns: [
        // Supabase Storage public bucket for admin-uploaded popup images.
        // When a CSP is added (see note above), allowlist this origin too.
        { protocol: "https", hostname: "*.supabase.co" },
      ],
    },
    async headers() {
      return [{ source: "/:path*", headers: securityHeaders }];
    },
  };
}
