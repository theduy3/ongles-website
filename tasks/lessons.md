# Lessons

## Verification
- **Grep the rendered FIELD, not lookalike copy.** Debugging admin-store-settings, I concluded "live price edit broken" because `grep "From $60"` still matched after editing to $199. Reality: `From $60.` is **static marketing copy** inside `dict.serviceDetails[id].metaDescription` (and JSON-LD), while the live price renders as lowercase `from $199` in a specific `<span>`. Case + lookalike text produced a false negative that triggered an unnecessary `force-dynamic` refactor (later reverted). Rule: when a value "won't update," log/inspect the exact rendered field before concluding failure. (admin-store-settings, 2026-06-05)
- **ISR + revalidateTag is stale-while-revalidate.** First request after a tag purge serves STALE and regenerates in the background; the fresh value appears on the **2nd** request. Poll ≥2 times before declaring it broken. (admin-store-settings)

## Next.js (this repo)
- **`next start` is incompatible with `output: "standalone"`** (set in next.config.ts for Docker). It serves a broken/stale app and prints a warning that's easy to miss. Test production locally with `node .next/standalone/server.js` after `cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public` and exporting env (`set -a; . ./.env.local; set +a`). (admin-store-settings)
- **Worktree builds need their own `node_modules`.** `turbopack.root` is pinned to the project dir, so Turbopack won't resolve `next` up-tree the way `bun` does; a relative `node_modules` symlink is rejected ("points out of filesystem root"). Run `bun install` inside the worktree (gitignored). (admin-store-settings)
- **`bun test` collides with Playwright** (both define global `test()`). Scope unit tests to `bun test src/`; keep Playwright on `test:e2e`. (admin-store-settings)
