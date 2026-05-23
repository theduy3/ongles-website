import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";

// Newsletter subscription endpoint for Ongles Maily. Validates the submitted
// email and upserts it into the newsletter_subscribers table via the service-role
// admin client. Configure Supabase env vars in .env.local; without them the
// endpoint logs and returns success (dev no-op), mirroring the contact route's
// graceful degradation when Resend is unconfigured.
const NewsletterSchema = z.object({
  email: z.string().email("A valid email address is required"),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 },
    );
  }

  const parsed = NewsletterSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Validation failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 },
    );
  }

  const { email } = parsed.data;
  const supabase = getSupabaseAdmin();

  // Supabase not wired up (e.g. local dev without secrets) — accept silently.
  if (!supabase) {
    console.warn(
      "[newsletter] Supabase not configured — accepting subscription in development:",
      email,
    );
    return NextResponse.json({ success: true });
  }

  try {
    const { error } = await supabase
      .from("newsletter_subscribers")
      .upsert(
        { email, source: "website" },
        { onConflict: "email", ignoreDuplicates: true },
      );

    if (error) {
      console.error("[newsletter] upsert error:", error.message);
      return NextResponse.json(
        {
          success: false,
          error: "Unable to subscribe at this time. Please try again shortly.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(
      "[newsletter] unexpected error:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred. Please try again shortly.",
      },
      { status: 500 },
    );
  }
}
