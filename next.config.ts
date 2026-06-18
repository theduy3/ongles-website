import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

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
// The import lives INSIDE the async function and is gated on PHASE_PRODUCTION_BUILD
// so it NEVER runs during `next dev` (config is loaded on dev startup too). This
// allows configs to be intentionally incomplete while Plan 01-2 data is mid-fill.
//
// The await import() uses Next.js SWC require-hooks which transpile the .ts source
// at build time — no tsx/ts-node needed, works in node:20-alpine (Docker build stage).
// Throwing inside this function propagates through normalizeConfig() to next-build.js
// .catch() → printAndExit() → process.exit(1), aborting the Dokploy deploy.
//
// NOTE: plain `next build` without PHASE_PRODUCTION_BUILD set also triggers the
// guard — PHASE_PRODUCTION_BUILD is set automatically by Next.js when running
// `next build`, not a custom env var. The env var PHASE_PRODUCTION_BUILD used in
// the plan notes refers to the Next.js constant value 'phase-production-build'
// that the framework passes as the `phase` argument to this function.
export default async function config(phase: string): Promise<NextConfig> {
  if (phase === PHASE_PRODUCTION_BUILD) {
    // Dynamic import keeps the validator out of dev-server module graph entirely.
    const { assertAllTenantsComplete } = await import(
      "./src/config/config-completeness"
    );
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
