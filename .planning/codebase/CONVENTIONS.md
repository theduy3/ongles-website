# Coding Conventions

**Analysis Date:** 2026-06-17

## Naming Patterns

**Files:**
- kebab-case for component and utility files: `PageHeader.tsx`, `deep-merge.ts`, `admin-http.ts`, `store-settings-schema.ts`
- Index files re-export from subdirectories: `src/config/index.ts`, `src/config/tenants/ongles-maily/index.ts`
- Test files follow source name + `.test.ts`: `proxy.ts` → `proxy.test.ts`, `locations.ts` → `locations.test.ts`
- Type-only files use same pattern: `types.ts`, `store-settings-schema.ts`

**Functions:**
- camelCase for all functions: `mapLink()`, `deepMerge()`, `buildSalonCards()`, `hasValidSession()`
- Async functions clearly named: `sendContactEmail()`, `getStoreConfig()`, `resolveTenant()`
- Helper functions prefixed for purpose: `storeError()`, `badRequest()`, `guard()`
- Intentionally unused parameters prefixed with `_`: enforced by eslint config, see `eslint.config.mjs`

**Variables:**
- camelCase for all variables, constants, and properties: `locations`, `galleryImages`, `defaultLocale`, `SESSION_COOKIE`
- Constants (module-level non-config) in UPPER_SNAKE_CASE when they're sentinel values: `LOCALE_COOKIE`, `LOGIN_PATHS`, `STANDALONE_PATHS`
- Structured record keys use camelCase internally: `storeId`, `widgetHost`, `phoneHref`, `bookerSlug`

**Types:**
- PascalCase for type names: `TenantSite`, `TenantConfig`, `Location`, `Service`, `Dictionary`, `Locale`
- Union types with descriptive names: `ServiceId = "pose-ongles" | "remplissage" | ...`, `Locale = "fr" | "en"`
- Generic type parameters stay single-letter (T, K, V) for single use, or descriptive (TenantConfig) for domain types

## Code Style

**Formatting:**
- ESLint enforces style via `eslint-config-next` (core-web-vitals + TypeScript) from `eslint.config.mjs`
- Config uses Flat Config format (eslint v9 style)
- No dedicated Prettier config — style delegated to ESLint

**Linting:**
- `npm run lint` runs ESLint across the codebase
- Unused variables trigger warnings, except those prefixed with `_` (intentional)
- Next.js-specific rules applied automatically via `eslint-config-next`

## Import Organization

**Order:**
1. External packages (React, Next.js, third-party): `import React`, `import { NextResponse }`, `import { z } from "zod"`
2. Internal absolute imports via `@/` path alias: `import { deepMerge } from "@/config/deep-merge"`
3. Type imports kept separate: `import type { TenantSite } from "@/config/types"`
4. JSON literal imports (dictionaries, configs): `import en from "@/dictionaries/en.json"`

**Path Aliases:**
- `@/*` maps to `src/*` (tsconfig.json line 21-23)
- Always use `@/` prefix for internal imports, never relative paths like `../../../lib/foo`
- Enables refactoring and keeps imports legible across directory depth

## Error Handling

**Patterns:**
- Try-catch for async JSON parsing: catch block returns 400 response, see `src/app/api/contact/route.ts` line 16-21
- Zod schema validation with `.safeParse()` for untrusted input: `ContactSchema.safeParse(body)` returns `{ success, error }` discriminated union
- HTTP response wrapper functions for consistency: `storeError()`, `badRequest()` in `src/lib/admin-http.ts` line 17-33
- Loud failure policy: never silently swallow errors. Always log context and return user-facing error message
  - Example: contact route logs `[contact] email send failed:` then returns 502, line 51-56
  - Example: admin routes log `[admin] store operation failed:` with details, line 24-28
- Discriminated unions for result types: `{ ok: true } | { reason: "not_configured" } | { reason: "failed"; detail: string }` in `src/lib/admin-http.ts`

**Validation:**
- Zod schemas for all untrusted input (request bodies, form data, env vars): `ContactSchema`, `StoreSettingsSchema` in `src/lib/store-settings-schema.ts`
- `.strict()` mode enforced where structural keys shouldn't change at runtime: `HoursEntrySchema.strict()` prevents accidental typos, line 28
- `.optional()` for sparse overrides (runtime settings don't require all static config keys)

## Logging

**Framework:** Primarily `console.error()` and `console.warn()` for operational events

**Patterns:**
- Prefix logs with module scope in brackets: `[contact]`, `[admin]`, `[seo-shim]`
- Log at module load time to report initialization: `[seo-shim] lifted legacy content SEO for ongles-maily/en: meta, services, gallery`
- Error logging includes full context: `console.error("[contact] email send failed:", result.detail)`
- Warning only in development: `console.warn("[contact] email provider not configured — accepting in development:", parsed.data)` line 47

## Comments

**When to Comment:**
- WHY comments explain business logic or architectural decisions
  - Example: `// WHY: dictionary composition must let a tenant re-word any shared string...` in `src/config/deep-merge.test.ts` line 4-5
  - Example: `// WHY: Existing callers pass only loc and must still compile + work.` in `src/lib/locations.test.ts` line 16-17
- Business rules that prevent future misunderstanding: `// CRITICAL: src/dictionaries/fr.json and en.json MUST have identical key structure`
- Guard clause comments explain guard logic: `// Only one proxy file is supported, auth gate for /admin/* /api/admin/*` in `src/proxy.ts` line 9
- Implementation notes for non-obvious structures: `// Canonical dictionary shape, derived from the English JSON...` in `src/lib/dictionary.ts` line 1-3

**JSDoc/TSDoc:**
- Minimal use — types are self-documenting
- Used for public exported functions with complex signatures: `export type Dictionary = typeof en;` with comment block in `src/lib/dictionary.ts`
- Not required for obvious helper functions or callback parameters

## Function Design

**Size:** Functions typically 10-40 lines, max 50 lines
- Example: `mapLink()` in `src/lib/locations.ts` is 15 lines
- Example: `deepMerge()` recursive utility is 20 lines
- Example: `hasValidSession()` authentication check is 12 lines
- Large API handlers break out into helpers (guard, validation, response mapping)

**Parameters:** 
- Max 3-4 parameters for regular functions
- Use object destructuring for optional config: `{ storeId = "OM", widgetHost = "..." }` in `src/components/ClientPortalWidget.tsx` line 9-14
- Dependency injection via optional parameter: `mapLink(loc, site?)` allows caller to override config

**Return Values:**
- Discriminated unions for operations that can fail: `{ ok: true; data: T } | { reason: string; detail?: string }`
- Avoid null/undefined returns; prefer throwing or returning error tuple
- Immutable by default: `deepMerge()` returns new object, never mutates inputs (test verifies at line 30-33)

## Module Design

**Exports:**
- Named exports for utilities: `export function deepMerge()`, `export const locales`
- Default exports for React components: `export function PageHeader() { ... }`
- Type exports explicit: `export type Locale = ...`, `export type TenantSite = ...`
- Barrel files (`index.ts`) re-export submodules for clean organization

**Barrel Files:**
- `src/config/index.ts` exports resolved tenant config: used across the app via `import { site, locations } from "@/config"`
- Tenant subdirectories use barrels: `src/config/tenants/ongles-maily/index.ts` exports location, site, services
- Enables clean imports without exposing internal file structure

## Locale & Dictionary Parity (CRITICAL)

**Problem:** Type `Dictionary = typeof en` provides NO compile-time guard for missing keys in other locale files.

**Consequence:** Missing keys in `src/dictionaries/fr.json` silently become `undefined` at runtime.

**Rule:** `src/dictionaries/fr.json` MUST have identical key structure to `src/dictionaries/en.json` — every key in `en.json` must exist in `fr.json`.

**Validation:**
- No automated check exists — **manual verification required on every locale file change**
- Test in `src/app/[lang]/dictionaries.test.ts` validates types but does NOT catch missing keys at runtime
- When adding a key to `en.json`, immediately add it (with translated value) to `fr.json` in the same location

**Example:**
```json
// en.json
{
  "nav": {
    "home": "Home",
    "services": "Services"
  }
}

// fr.json MUST match structure
{
  "nav": {
    "home": "Accueil",
    "services": "Services"
  }
}
```

## Immutability Conventions

**Pattern:** Use spread operator for immutable updates, never mutation

**Examples from codebase:**
- `deepMerge()` creates new object: `{ ...base, [key]: mergedValue }` — test verifies non-mutation at `src/config/deep-merge.test.ts` line 30-33
- Settings override: `{ ...staticSite, name: "Z Salon" }` creates copy with property override in `src/lib/locations.test.ts` line 10-13
- Never modify input parameters or closure state

---

*Convention analysis: 2026-06-17*
