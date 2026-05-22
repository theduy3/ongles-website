import { site } from "@/lib/site";

// Contact email delivery via the Resend REST API (https://resend.com/docs).
// We call the REST endpoint with fetch rather than pulling in the SDK — it's a
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

export async function sendContactEmail(data: ContactPayload): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;
  const to = process.env.CONTACT_TO_EMAIL ?? site.contact.email;

  // Provider not wired up (e.g. local dev without secrets). Caller decides policy.
  if (!apiKey || !from) {
    return { ok: false, reason: "not_configured" };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        reply_to: data.email,
        subject: `New website message from ${data.firstName} ${data.lastName}`,
        text: `From: ${data.firstName} ${data.lastName} <${data.email}>\n\n${data.message}`,
      }),
    });

    if (!res.ok) {
      return { ok: false, reason: "send_failed", detail: `Resend responded ${res.status}` };
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
