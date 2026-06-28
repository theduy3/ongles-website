// Generate the two project-level Supabase API keys — anon and service_role —
// HS256-signed with the project JWT secret. Mirror of gen-tenant-jwts.mjs, for
// the OTHER two keys the stack needs (the tenant-scoped tokens come from that
// sibling script).
//
// Use this when ROTATING the JWT secret: a leaked key on self-hosted Supabase
// can only be revoked by changing JWT_SECRET, which forces regenerating anon +
// service_role + every tenant JWT together. Run order on rotation:
//   1. mint new secret:   openssl rand -base64 32   (stay <=63 chars; -base64 48 can exceed it)
//   2. this script:       SUPABASE_JWT_SECRET="<new secret>" node scripts/gen-supabase-keys.mjs
//   3. tenant tokens:     SUPABASE_JWT_SECRET="<new secret>" node scripts/gen-tenant-jwts.mjs
//   4. update Supabase service env (JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY) + restart
//   5. update each Next app env (SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
//      SUPABASE_TENANT_JWT) + redeploy
//
// Usage:
//   SUPABASE_JWT_SECRET="<project jwt secret>" node scripts/gen-supabase-keys.mjs
//
// The secret is NEVER committed. The service_role key bypasses RLS — treat it
// as a server-only secret and never ship it to the browser.

import { createHmac } from "node:crypto";

const secret = process.env.SUPABASE_JWT_SECRET;
if (!secret) {
  console.error(
    "Missing SUPABASE_JWT_SECRET. Find it in Supabase dashboard → Settings → API → JWT Secret,\n" +
      "or mint a new one with: openssl rand -base64 32   (keep it <=63 chars)",
  );
  process.exit(1);
}

// Long-lived deploy-time credentials, rotated only when the JWT secret rotates.
// Matches the 10-year TTL convention in gen-tenant-jwts.mjs.
const TTL_SECONDS = 60 * 60 * 24 * 365 * 10;

const base64url = (input) =>
  Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

function sign(payload) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const signature = createHmac("sha256", secret)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${data}.${signature}`;
}

// iat must be a real second-count; Date.now is fine in a one-off CLI script.
const iat = Math.floor(Date.now() / 1000);

const ROLES = [
  { role: "anon", envVar: "SUPABASE_ANON_KEY" },
  { role: "service_role", envVar: "SUPABASE_SERVICE_ROLE_KEY" },
];

for (const { role, envVar } of ROLES) {
  const token = sign({ role, iss: "supabase", iat, exp: iat + TTL_SECONDS });
  console.log(`# ${role}`);
  console.log(`${envVar}=${token}\n`);
}

console.error(
  "Reminder: update these in the Supabase service env AND each Next app env, then restart/redeploy.\n" +
    "service_role bypasses RLS — keep it server-only, never in NEXT_PUBLIC_*.",
);
