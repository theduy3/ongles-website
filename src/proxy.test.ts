import { describe, expect, it } from "bun:test";
import { NextRequest } from "next/server";

import { proxy } from "./proxy";

// Build a minimal NextRequest for a given path. No cookie / accept-language by
// default, so locale routing falls back to the default locale ("fr").
function req(
  path: string,
  opts: { acceptLanguage?: string; cookie?: string } = {},
): NextRequest {
  const headers = new Headers();
  if (opts.acceptLanguage) headers.set("accept-language", opts.acceptLanguage);
  if (opts.cookie) headers.set("cookie", opts.cookie);
  return new NextRequest(new URL(`http://localhost${path}`), { headers });
}

// A standalone passthrough returns NextResponse.next() — no Location header.
function locationOf(res: Response): string | null {
  const loc = res.headers.get("location");
  return loc ? new URL(loc).pathname : null;
}

describe("proxy — standalone un-localized pages pass through (no locale redirect)", () => {
  it("serves /clientportal directly", async () => {
    const res = await proxy(req("/clientportal"));
    expect(locationOf(res)).toBeNull();
  });

  it("serves /subscription directly", async () => {
    const res = await proxy(req("/subscription"));
    expect(locationOf(res)).toBeNull();
  });

  // Regression guards — the proven kiosk pages must keep passing through.
  it("serves /checkin directly", async () => {
    const res = await proxy(req("/checkin"));
    expect(locationOf(res)).toBeNull();
  });

  it("serves /queue directly", async () => {
    const res = await proxy(req("/queue"));
    expect(locationOf(res)).toBeNull();
  });

  it("serves /topemployee directly", async () => {
    const res = await proxy(req("/topemployee"));
    expect(locationOf(res)).toBeNull();
  });
});

describe("proxy — public pages still get locale routing", () => {
  it("redirects a bare public path to the default locale", async () => {
    const res = await proxy(req("/about"));
    expect(res.status).toBe(307);
    expect(locationOf(res)).toBe("/fr/about");
  });

  it("honours the accept-language header for the redirect locale", async () => {
    const res = await proxy(req("/about", { acceptLanguage: "en-US,en;q=0.9" }));
    expect(locationOf(res)).toBe("/en/about");
  });

  it("passes through already-localized paths untouched", async () => {
    const res = await proxy(req("/fr/contact"));
    expect(locationOf(res)).toBeNull();
  });
});
