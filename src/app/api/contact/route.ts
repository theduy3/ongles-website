import { NextResponse } from "next/server";
import { z } from "zod";
import { sendContactEmail } from "@/lib/email";

// Contact form handler for the rebuilt Squarespace form. Validates input, then
// delivers via Resend (see src/lib/email.ts). Configure secrets in .env.local.
const ContactSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.email("A valid email is required"),
  message: z.string().trim().min(1, "Message is required"),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
  }

  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Validation failed";
    return NextResponse.json({ success: false, error: message }, { status: 422 });
  }

  const result = await sendContactEmail(parsed.data);

  if (result.ok) {
    return NextResponse.json({ success: true, data: { received: true } });
  }

  if (result.reason === "not_configured") {
    // Policy: in production a missing provider is a real outage — fail loud so
    // leads are never silently dropped. In development, log and accept so the
    // demo form is usable without secrets.
    if (process.env.NODE_ENV === "production") {
      console.error("[contact] email provider not configured in production");
      return NextResponse.json(
        { success: false, error: "Messaging is temporarily unavailable. Please email us directly." },
        { status: 503 },
      );
    }
    console.warn("[contact] email provider not configured — accepting in development:", parsed.data);
    return NextResponse.json({ success: true, data: { received: true } });
  }

  // send_failed: provider rejected or network error. Surface, never swallow.
  console.error("[contact] email send failed:", result.detail);
  return NextResponse.json(
    { success: false, error: "We couldn't send your message. Please try again shortly." },
    { status: 502 },
  );
}
