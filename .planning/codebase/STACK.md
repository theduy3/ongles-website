# Technology Stack

**Analysis Date:** 2026-06-17

## Languages

**Primary:**
- TypeScript 5 - All source code, configuration, and scripts
- JavaScript (Node.js) - Build-time scripts and CLI utilities

**Secondary:**
- SQL - Supabase migrations in `supabase/migrations/`
- TOML - Supabase configuration (`supabase/config.toml`)

## Runtime

**Environment:**
- Node.js 20 (Alpine Linux)
- Bun 1.x - Primary package manager and test runner
- npm (bundled with Node) - Used in Docker build for `npm run build`

**Package Manager:**
- Bun (via `bun.lock` lockfile)
- Lockfile: `bun.lock` present and committed

## Frameworks

**Core:**
- Next.js 16.2.6 - React meta-framework for server-side rendering, API routes, and static generation
  - Output: `standalone` (Node.js server with no external dependencies)
  - Turbopack enabled for fast builds and dev mode
- React 19.2.4 - UI component library
- React DOM 19.2.4 - React rendering target

**UI & Styling:**
- Tailwind CSS 4 - Utility-first CSS framework via `@tailwindcss/postcss`
- Framer Motion 12.39.0 - Animation library for React components
- PostCSS 4 - CSS transformation with Tailwind

**Form & Validation:**
- Zod 4.4.3 - TypeScript-first schema validation (contact form, newsletter, API inputs)

**Session & Authentication:**
- iron-session 8.0.4 - Encrypted cookie-based session management (admin portal)

**Testing:**
- Playwright 1.60.0 - E2E testing framework for critical user flows
  - Runs against production builds (`next build && next start`)
  - Configured to run in `./e2e` directory

**Build/Dev:**
- TypeScript 5 - Type checking and compilation
- ESLint 9 - JavaScript/TypeScript linting
  - Config: `eslint-config-next` (16.2.6) - Next.js-specific rules
  - Config extension: `eslint-config-next/core-web-vitals` and `/typescript`
- Next.js built-in type checking and NextEnv

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.106.1 - Supabase database client
  - Used for: popup management, newsletter subscriptions, store settings (admin)
  - Server-only in production (RLS enforced)
  - Two client modes: public (anon key, RLS restricted) and admin (service-role key)

**Infrastructure:**
- `framer-motion` 12.39.0 - Motion and animation library
- `iron-session` 8.0.4 - Admin session management (encrypted cookies, no external session store)
- `zod` 4.4.3 - Schema validation at API boundaries

**Type Safety:**
- `@types/node` 20 - Node.js type definitions
- `@types/react` 19 - React type definitions
- `@types/react-dom` 19 - React DOM type definitions

## Configuration

**Environment:**
- Required at RUNTIME (per-container deployment): `TENANT`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`
- Optional at RUNTIME: `SUPABASE_TENANT_JWT` (per-tenant JWT for scoped reads)
- Build-time (Docker `--build-arg`): `TENANT` baked into image; each domain is a separate build
- Contact form (optional): `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, `CONTACT_TO_EMAIL`
- Google Business Profile (build-time script only, not runtime): `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN`, `GOOGLE_BUSINESS_ACCOUNT_ID`, `GOOGLE_BUSINESS_LOCATION_ID`
- Popup source (optional): `POPUP_SOURCE_URL`

**Next.js Configuration:**
- `next.config.ts` - Typescript config for Next.js; includes:
  - Output mode: `standalone` for Docker
  - Turbopack with `root: __dirname`
  - Security headers (CSP, HSTS, X-Frame-Options, Permissions-Policy)
  - Remote image patterns for Google Business Profile, Supabase bucket, and tenant-specific domains
  - Powered-by header disabled

**TypeScript Configuration:**
- `tsconfig.json` - TypeScript compiler options
  - Target: ES2017
  - Module: esnext (bundled by Next.js)
  - Strict mode enabled
  - Path alias: `@/*` → `./src/*`
  - Plugins: Next.js TypeScript plugin

**Linting Configuration:**
- `eslint.config.mjs` - ESLint 9 flat config format
  - Extends: `eslint-config-next/core-web-vitals` and `/typescript`
  - Custom rules: allow leading-underscore unused args (TS convention)

**Build & Dev:**
- `postcss.config.mjs` - PostCSS config for Tailwind CSS
- `playwright.config.ts` - E2E test configuration
  - Test directory: `./e2e`
  - Base URL: `http://localhost:3100`
  - Web server: builds and starts production Next.js server on port 3100
  - Retries: 2 in CI, 0 locally
  - Reporter: GitHub reporter in CI, list reporter locally

**Dockerfile:**
- Multi-stage build: deps (Bun) → build (Node) → runner (Node minimal)
- Base images: `oven/bun:1-alpine` (deps), `node:20-alpine` (build, runner)
- Build artifact: `/app/.next/standalone` (no external deps needed)
- Entry point: `node server.js`

## Platform Requirements

**Development:**
- Bun 1.x (or Node 20 + npm)
- Node.js 20+
- TypeScript 5
- ESLint 9
- Playwright (for E2E testing)

**Production:**
- Node.js 20 (Alpine Linux base in Docker)
- PORT environment variable (default: 3000)
- NODE_ENV set to production
- Secrets: Supabase credentials, Resend API key (optional), admin auth secrets
- Running in Docker container or standalone Node.js environment

**Deployment Target:**
- Docker container (via VPS with Dokploy webhook auto-deploy)
- Standalone Node.js server (`server.js` in `.next/standalone`)
- Single image serves all three tenants (build-time agnostic, runtime `TENANT` env var selection)

---

*Stack analysis: 2026-06-17*
