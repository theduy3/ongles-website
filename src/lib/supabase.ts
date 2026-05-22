import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Two clients with different trust levels:
//   - public: anon key, used for the public popup read (RLS allows SELECT only).
//   - admin:  service-role key, server-only, bypasses RLS for writes + uploads.
//
// Both are created lazily and return null when their env is missing so the app
// degrades gracefully (build, local dev, and e2e fall back to popups.json).

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Server-only clients: never persist a session or refresh tokens.
const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } } as const;

let publicClient: SupabaseClient | null | undefined;
let adminClient: SupabaseClient | null | undefined;

export function getSupabasePublic(): SupabaseClient | null {
  if (publicClient !== undefined) return publicClient;
  publicClient = url && anonKey ? createClient(url, anonKey, clientOptions) : null;
  return publicClient;
}

// Server-only. Importing this into a client component would leak the service
// key, so it throws if the service key is somehow read in the browser bundle.
export function getSupabaseAdmin(): SupabaseClient | null {
  if (typeof window !== "undefined") {
    throw new Error("getSupabaseAdmin must not be called in the browser");
  }
  if (adminClient !== undefined) return adminClient;
  adminClient = url && serviceKey ? createClient(url, serviceKey, clientOptions) : null;
  return adminClient;
}

export const POPUPS_TABLE = "popups";
export const POPUP_IMAGES_BUCKET = "popup-images";
