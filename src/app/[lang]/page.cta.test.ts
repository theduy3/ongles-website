import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

// Source tripwire for homepage CTA wiring.
//
// WHY this is a source-level test, not a behavioral one: every current tenant
// has site.booking === "/book-online", so swapping the hardcoded
// `/${lang}/book-online` for `/${lang}${site.booking}` renders an identical
// href — a behavioral e2e cannot distinguish them. The intent we must protect
// is that the homepage routes through tenant config (so a future tenant with a
// different booking path is honoured) and that phone CTAs dial the
// admin-configured number instead of scrolling to an anchor. These tripwires
// fail the moment someone reintroduces a hardcode.
const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("homepage CTA wiring", () => {
  test("Book buttons route through site.booking, not a hardcoded path", () => {
    expect(source).not.toContain("/${lang}/book-online");
    expect(source).toContain("/${lang}${site.booking}");
  });

  test("Call-to-Book buttons dial the admin-configured phone, not an anchor", () => {
    expect(source).not.toContain("/${lang}#location");
    expect(source).toContain("site.contact.phoneHref");
  });
});
