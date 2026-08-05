# Homepage Direct-Answer Placement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make the homepage hero the first visual section while retaining the audited direct-answer content as visible H2 content immediately before services.

**Architecture:** Extend the shared AnswerBlock with an optional headingLevel prop whose default remains H1. Reorder only the homepage so its hero title becomes H1 and its existing AnswerBlock follows the hero as a compact H2 section; all other callers keep their current behavior. Lock the DOM contract with a bilingual Playwright regression test, then run the existing unit, lint, build, SEO, and responsive checks.

**Tech Stack:** Next.js 16.2.6 App Router, React 19.2.4, TypeScript 5 strict, Tailwind CSS 4, Bun, Playwright.

## Global Constraints

- Use Next.js 16.2.6 conventions and read the relevant guide in node_modules/next/dist/docs/ before writing Next.js code.
- Keep the homepage direct-answer copy in the tenant SEO configuration; do not duplicate or rewrite it in JSX.
- Keep French and English locale structures in parity.
- Keep the direct-answer content visible, accessible, server-rendered, and crawlable; do not use display:none, off-screen hiding, aria-hidden, or metadata-only copy.
- Scope the behavior change to the homepage; every other AnswerBlock caller must retain its default H1 behavior.
- Do not change metadata, JSON-LD, URL structure, navigation, CTAs, images, service cards, or add dependencies.
- Preserve the existing compact sand treatment and the hero's visual classes, text, spacing, imagery, and animations.
- Verify with bun test src/, bun run lint, bun run build, and the relevant Playwright tests before declaring completion.

---

### Task 1: Add the failing homepage hierarchy regression test

**Files:**
- Modify: e2e/homepage.spec.ts

**Interfaces:**
- Consumes: The rendered homepage at /fr and /en, including main, heading, answer-copy, and #services DOM nodes.
- Produces: A regression contract proving that the hero owns the only H1, the localized direct answer is an H2, and the answer section is between the hero and services.

- [ ] **Step 1: Add the bilingual failing test**

Append this test to the existing homepage enhancement suite in e2e/homepage.spec.ts:

~~~typescript
  test("keeps the hero first and places the direct answer before services", async ({
    page,
  }) => {
    for (const path of ["/fr", "/en"]) {
      await page.goto(path);

      const main = page.locator("main");
      const h1 = main.locator("h1");
      const answerHeading = main.getByRole("heading", {
        level: 2,
        name: /Ongles Maily/i,
      });

      await expect(h1).toHaveCount(1);
      await expect(h1).toBeVisible();
      await expect(answerHeading).toHaveCount(1);
      await expect(answerHeading).toBeVisible();

      const answerCopy =
        path === "/fr"
          ? /outils désinfectés après chaque cliente/i
          : /tools disinfected after every client/i;
      await expect(main.getByText(answerCopy)).toBeVisible();

      const answerBeforeServices = await main.evaluate((root) => {
        const heroH1 = root.querySelector("h1");
        const overviewH2 = Array.from(root.querySelectorAll("h2")).find((node) =>
          /Ongles Maily/i.test(node.textContent ?? ""),
        );
        const overviewSection = overviewH2?.closest("section");
        const services = root.querySelector("#services");

        return Boolean(
          heroH1 &&
            overviewSection &&
            services &&
            (heroH1.compareDocumentPosition(overviewSection) &
              Node.DOCUMENT_POSITION_FOLLOWING) &&
            (overviewSection.compareDocumentPosition(services) &
              Node.DOCUMENT_POSITION_FOLLOWING),
        );
      });

      expect(answerBeforeServices).toBe(true);
    }
  });
~~~

- [ ] **Step 2: Run the focused test and verify it fails for the intended reason**

Run:

~~~bash
bun run test:e2e -- e2e/homepage.spec.ts -g "keeps the hero first"
~~~

Expected: FAIL against the current implementation because the homepage answer
heading is still an H1 before the hero, so no matching H2 exists and the
document order contract is not satisfied.

- [ ] **Step 3: Commit the failing regression test**

~~~bash
git add e2e/homepage.spec.ts
git commit -m "test: lock homepage answer placement"
~~~

### Task 2: Add an opt-in heading level to AnswerBlock

**Files:**
- Modify: src/components/AnswerBlock.tsx:1-49

**Interfaces:**
- Consumes: Existing AnswerBlock props and all current callers.
- Produces: An optional headingLevel prop with type "h1" | "h2"; omitted or defaulted values render H1 exactly as before.

- [ ] **Step 1: Add the typed prop and dynamic intrinsic heading**

Extend the existing props object and destructuring as follows, keeping all
existing style expressions unchanged:

~~~typescript
type AnswerBlockProps = {
  heading: string;
  text: string;
  link?: { href: string; label: string };
  compact?: boolean;
  headingLevel?: "h1" | "h2";
};

export function AnswerBlock({
  heading,
  text,
  link,
  compact = false,
  headingLevel = "h1",
}: AnswerBlockProps) {
  const HeadingTag: "h1" | "h2" = headingLevel;
~~~

Replace only the existing h1 opening and closing tags with HeadingTag. Keep the
same className expression:

~~~tsx
        <HeadingTag
          className={`text-espresso ${compact ? "text-2xl md:text-3xl" : "text-4xl md:text-6xl"}`}
        >
          {heading}
        </HeadingTag>
~~~

Update the component comments so they describe a visible, self-contained
answer block whose caller controls placement and heading level. State that the
default is H1 and that compact changes visual weight only.

- [ ] **Step 2: Run focused static checks**

Run:

~~~bash
bun run lint -- src/components/AnswerBlock.tsx
bun test src/
~~~

Expected: PASS. Existing routes still receive the default H1 because no caller
has opted into H2 yet.

- [ ] **Step 3: Commit the shared component change**

~~~bash
git add src/components/AnswerBlock.tsx
git commit -m "feat: support answer block heading levels"
~~~

### Task 3: Reorder and relabel the homepage only

**Files:**
- Modify: src/app/[lang]/page.tsx:101-204

**Interfaces:**
- Consumes: AnswerBlock headingLevel from Task 2, existing hero and SEO values, and the Task 1 Playwright contract.
- Produces: Homepage DOM order hero H1 → compact answer H2 → services; all other page routes remain unchanged.

- [ ] **Step 1: Remove the pre-hero AnswerBlock**

Delete the homepage AnswerBlock currently rendered before the hero. Replace its
comment with a comment describing the hero as the first visible section.

- [ ] **Step 2: Promote only the hero title element to H1**

Change the hero title element from h2 to h1 without changing its text,
className, nested emphasis element, or surrounding layout:

~~~tsx
              <h1 className="mt-6 max-w-xl text-5xl leading-[1.05] text-espresso md:text-6xl">
                {dict.hero.taglineLead}{" "}
                <em className="italic text-mocha">
                  {dict.hero.taglineEmphasis}
                </em>
              </h1>
~~~

- [ ] **Step 3: Render the existing answer immediately after the hero**

After the hero section's closing tag and before the existing services section,
insert the same configured content with compact styling and the H2 opt-in:

~~~tsx
      {/* Direct-answer block — visible local context after the hero; carries an H2. */}
      <AnswerBlock
        heading={seo.meta.homeAnswerHeading}
        text={seo.meta.homeAnswerBlock}
        compact
        headingLevel="h2"
      />
~~~

Do not change the services section or any later section.

- [ ] **Step 4: Run the focused regression test**

Run:

~~~bash
bun run test:e2e -- e2e/homepage.spec.ts -g "keeps the hero first"
~~~

Expected: PASS for both /fr and /en. The only H1 is inside the hero, the
localized answer heading is an H2, and its section appears before #services.

- [ ] **Step 5: Commit the homepage wiring**

~~~bash
git add src/app/[lang]/page.tsx
git commit -m "fix: place homepage answer below hero"
~~~

### Task 4: Run full verification and perform the responsive visual check

**Files:**
- Verify: src/components/AnswerBlock.tsx
- Verify: src/app/[lang]/page.tsx
- Verify: e2e/homepage.spec.ts
- Verify: src/dictionaries/fr.json, src/dictionaries/en.json, and tenant SEO files through existing tests

**Interfaces:**
- Consumes: The completed homepage implementation and regression test.
- Produces: Evidence that hierarchy, locale parity, SEO behavior, build health,
  and visual placement all satisfy the approved spec.

- [ ] **Step 1: Run source tests**

Run:

~~~bash
bun test src/
~~~

Expected: PASS, including the existing SEO parity, route, config, and trust
signal suites.

- [ ] **Step 2: Run lint and the production build**

Run:

~~~bash
bun run lint
bun run build
~~~

Expected: PASS with no TypeScript, ESLint, or Next.js build errors.

- [ ] **Step 3: Run homepage and SEO browser coverage**

Run:

~~~bash
bun run test:e2e -- e2e/homepage.spec.ts e2e/seo.spec.ts
~~~

Expected: PASS, including the new bilingual hierarchy/order assertion and the
existing canonical, hreflang, structured-data, sitemap, and service assertions.

- [ ] **Step 4: Inspect the rendered homepage at the approved widths**

With the production server available on port 3100, inspect /fr and /en at
390×844 and 1280×800. Confirm the hero is the first visible section, its image
and CTAs are unchanged, the compact sand answer band follows it, no horizontal
overflow or unexpected layout shift appears, and #services retains its existing
visual start.

- [ ] **Step 5: Review the final diff and working tree**

Run:

~~~bash
git diff --check
git status --short
~~~

Expected: no whitespace errors and no untracked or modified files outside the
three intended implementation/test files.
