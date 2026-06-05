<!-- s1 metadata
task-name: change-logo-and-favicon
scope: small
status: done
repo: /Users/theduy/Repo/maily-website
created-at: 2026-05-24
-->

# Change Logo + Favicon Implementation Plan

> **For agentic workers:** Small scope — implement directly with TDD discipline (build + visual verification). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the text `<Wordmark>` in the header with the real Ongles Maily logo PNG, and replace the browser favicon with the pink cursive "M" mark.

**Architecture:** Copy two brand assets from the design folder into the repo. Swap the inline `<span>` wordmark in `Header.tsx` for a `next/image` element. Replace the Next.js app-router favicon file (`src/app/icon.png`).

**Tech Stack:** Next.js (app router, file-convention icons), `next/image`, Tailwind.

**Source assets:**
- Logo: `…/MAILY/08_IT/Image/Logo Transparent - Ongles Maily - White.png` (829×302, RGBA, transparent bg — black "Ongles" + pink "Maily")
- Favicon: `…/MAILY/08_IT/Image/Favicon.png` (40×40, RGBA, pink cursive M)

**Decisions:**
- Logo file despite "White" name renders dark text + pink → correct on cream header (`bg-cream/90`).
- Favicon source is 40×40 — adequate for browser tab (16–32px render). PWA icons (`public/icon-192/512.png`) and `apple-icon.png` left untouched (out of scope; upscaling a 40×40 raster would degrade them).
- Header logo target height ~32px (`h-8`), `w-auto`, `priority` (above the fold). Intrinsic dims 829×302 passed to `next/image` to preserve ratio.

---

### Task 1: Copy brand assets into the repo

**Files:**
- Create: `public/images/logo.png`
- Replace: `src/app/icon.png`

- [ ] **Step 1: Copy logo into public/images**

```bash
cp "/Users/theduy/theduylifeos/Business OptCo/MAILY/08_IT/Image/Logo Transparent - Ongles Maily - White.png" \
   "/Users/theduy/Repo/maily-website/public/images/logo.png"
```

- [ ] **Step 2: Replace the favicon (app-router icon convention)**

```bash
cp "/Users/theduy/theduylifeos/Business OptCo/MAILY/08_IT/Image/Favicon.png" \
   "/Users/theduy/Repo/maily-website/src/app/icon.png"
```

- [ ] **Step 3: Verify both files landed with expected dimensions**

```bash
file public/images/logo.png src/app/icon.png
```

Expected: `logo.png … 829 x 302`, `icon.png … 40 x 40`.

---

### Task 2: Swap the text Wordmark for the logo image in Header.tsx

**Files:**
- Modify: `src/components/Header.tsx` (replace `Wordmark` component, lines 12–20 and its usage at line 37)

- [ ] **Step 1: Add the `next/image` import**

At top of `src/components/Header.tsx`, after `import Link from "next/link";` (line 4):

```tsx
import Image from "next/image";
```

- [ ] **Step 2: Replace the `Wordmark` component definition**

Replace lines 12–20 (the `// Serif-free wordmark…` comment + `function Wordmark()`) with:

```tsx
// Brand logo (real wordmark PNG, transparent bg) sized for the light header.
function Logo() {
  return (
    <Image
      src="/images/logo.png"
      alt={site.name}
      width={829}
      height={302}
      priority
      className="h-8 w-auto sm:h-9"
    />
  );
}
```

- [ ] **Step 3: Update the usage in the header Link**

Replace `<Wordmark />` (line 37) with:

```tsx
          <Logo />
```

- [ ] **Step 4: Typecheck + build**

Run:
```bash
cd /Users/theduy/Repo/maily-website && bun run build
```
Expected: build succeeds, no TypeScript errors, no unused-import warning for the removed wordmark.

- [ ] **Step 5: Visual verification (dev server)**

Run `bun run dev`, open `http://localhost:3000/en`. Confirm:
- Header shows the Ongles Maily logo image (not text), ~32px tall, crisp.
- Logo links to `/en`, aria-label intact.
- Browser tab shows the pink cursive "M" favicon (hard-refresh; favicons cache aggressively).
- Mobile (<1024px): logo still fits beside the hamburger.

- [ ] **Step 6: Commit**

```bash
git add public/images/logo.png src/app/icon.png src/components/Header.tsx
git commit -m "feat: use real logo image in header, swap favicon to M mark"
```

---

## Self-Review

- **Spec coverage:** (1) logo swap → Task 2; (2) favicon swap → Task 1 Step 2. Both covered.
- **Placeholder scan:** none — all code/commands literal.
- **Type consistency:** `Logo` defined Task 2 Step 2, used Task 2 Step 3. `site.name` already imported via `site` (line 6). `Image` import added Step 1.
- **Caveat:** favicon caching — instruct hard-refresh during verification.
