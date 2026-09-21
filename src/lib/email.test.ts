import { afterEach, describe, expect, mock, test } from "bun:test";
import { sendContactEmail } from "./email";

const payload = { firstName: "A", lastName: "B", email: "a@b.com", message: "hi" };
const envKeys = ["MAILERSEND_API_KEY", "RESEND_API_KEY", "CONTACT_FROM_EMAIL", "CONTACT_TO_EMAIL"];
const saved: Record<string, string | undefined> = {};
const realFetch = globalThis.fetch;
function setEnv(vars: Record<string, string | undefined>) {
  for (const k of envKeys) {
    saved[k] = process.env[k];
    if (vars[k] === undefined) delete process.env[k];
    else process.env[k] = vars[k];
  }
}

afterEach(() => {
  for (const k of envKeys) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  globalThis.fetch = realFetch;
  mock.restore();
});

describe("sendContactEmail provider selection", () => {
  test("returns not_configured when no provider key is set", async () => {
    setEnv({ CONTACT_FROM_EMAIL: "f@x.com", CONTACT_TO_EMAIL: "t@x.com" });
    const res = await sendContactEmail(payload);
    expect(res).toEqual({ ok: false, reason: "not_configured" });
  });

  test("uses MailerSend payload shape when MAILERSEND_API_KEY is set", async () => {
    setEnv({
      MAILERSEND_API_KEY: "ms-key",
      CONTACT_FROM_EMAIL: "from@x.com",
      CONTACT_TO_EMAIL: "to@x.com",
    });
    let captured: { url: string; init: RequestInit } | null = null;
    globalThis.fetch = mock(async (url: string, init: RequestInit) => {
      captured = { url, init };
      return new Response("{}", { status: 202 });
    }) as unknown as typeof fetch;

    const res = await sendContactEmail(payload);
    expect(res.ok).toBe(true);
    expect(captured!.url).toBe("https://api.mailersend.com/v1/email");
    const body = JSON.parse(captured!.init.body as string);
    expect(body.from).toEqual({ email: "from@x.com" });
    expect(body.to).toEqual([{ email: "to@x.com" }]);
    expect(body.reply_to).toEqual({ email: "a@b.com" });
  });

  test("falls back to Resend when only RESEND_API_KEY is set", async () => {
    setEnv({
      RESEND_API_KEY: "re-key",
      CONTACT_FROM_EMAIL: "from@x.com",
      CONTACT_TO_EMAIL: "to@x.com",
    });
    let captured: { url: string; init: RequestInit } | null = null;
    globalThis.fetch = mock(async (url: string, init: RequestInit) => {
      captured = { url, init };
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;

    const res = await sendContactEmail(payload);
    expect(res.ok).toBe(true);
    expect(captured!.url).toBe("https://api.resend.com/emails");
    const body = JSON.parse(captured!.init.body as string);
    expect(body.from).toBe("from@x.com");
    expect(body.to).toBe("to@x.com");
  });
});
