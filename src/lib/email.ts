// Contact email delivery via a transactional provider's REST API.
// Provider is selected by env: MAILERSEND_API_KEY wins, else RESEND_API_KEY.
// We call the REST endpoint with fetch rather than pulling in an SDK — it's a
// single request, so the dependency would not earn its weight.

export type ContactPayload = {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
};

export type EmailResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" }
  | { ok: false; reason: "send_failed"; detail: string };

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const MAILERSEND_ENDPOINT = "https://api.mailersend.com/v1/email";

type ProviderRequest = { url: string; headers: Record<string, string>; body: unknown };

function buildRequest(
  data: ContactPayload,
  from: string,
  to: string,
): ProviderRequest | null {
  const subject = `New website message from ${data.firstName} ${data.lastName}`;
  const text = `From: ${data.firstName} ${data.lastName} <${data.email}>\n\n${data.message}`;
  // MailerSend requires a bare address in from.email; "Name <addr>" is accepted
  // for CONTACT_FROM_EMAIL and split here. Resend takes the raw string.
  const fromMatch = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  const fromEmail = fromMatch ? fromMatch[2] : from;
  const fromName = fromMatch ? fromMatch[1] : undefined;

  const mailerSendKey = process.env.MAILERSEND_API_KEY;
  if (mailerSendKey) {
    return {
      url: MAILERSEND_ENDPOINT,
      headers: {
        Authorization: `Bearer ${mailerSendKey}`,
        "Content-Type": "application/json",
      },
      body: {
        from: { email: fromEmail, ...(fromName ? { name: fromName } : {}) },
        to: [{ email: to }],
        reply_to: { email: data.email },
        subject,
        text,
      },
    };
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    return {
      url: RESEND_ENDPOINT,
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: { from, to, reply_to: data.email, subject, text },
    };
  }

  return null;
}

export async function sendContactEmail(
  data: ContactPayload,
  fallbackToEmail?: string,
): Promise<EmailResult> {
  const from = process.env.CONTACT_FROM_EMAIL;
  const to = process.env.CONTACT_TO_EMAIL ?? fallbackToEmail ?? "";
  const request = from && to ? buildRequest(data, from, to) : null;

  // Provider not wired up (e.g. local dev without secrets). Caller decides policy.
  if (!request) {
    return { ok: false, reason: "not_configured" };
  }

  try {
    const res = await fetch(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(request.body),
    });

    if (!res.ok) {
      return { ok: false, reason: "send_failed", detail: `Provider responded ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: "send_failed",
      detail: err instanceof Error ? err.message : "Unknown network error",
    };
  }
}
