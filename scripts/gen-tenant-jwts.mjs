// Generate one long-lived, tenant-scoped JWT per branded container for use as
// NEXT_PUBLIC_SUPABASE_TENANT_JWT. Each JWT carries a `tenant_id` claim that the
// tenant-aware RLS policies match (supabase/migrations/20260606000000_*.sql), so
// a container can only read its own tenant's rows.
//
// The JWT is HS256-signed with the project JWT secret (Supabase dashboard →
// Settings → API → JWT Secret). Signed by hand with node:crypto so there is no
// jsonwebtoken dependency.
//
// Usage:
//   SUPABASE_JWT_SECRET="<project jwt secret>" node scripts/gen-tenant-jwts.mjs
//
// The secret is NEVER committed. The resulting tokens are public (they ship in
// the browser bundle) but each only unlocks its own tenant's rows.

import { createHmac } from "node:crypto";

const secret = process.env.SUPABASE_JWT_SECRET;
if (!secret) {
  console.error(
    "Missing SUPABASE_JWT_SECRET. Find it in Supabase dashboard → Settings → API → JWT Secret.",
  );
  process.exit(1);
}

// Keep this list in sync with the tenant registry (src/config/index.ts).
const TENANTS = ["ongles-maily", "ongles-charlesbourg", "ongles-rivieres"];

// Long-lived: these are deploy-time credentials, rotated only when the JWT
// secret rotates. 10 years.
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

for (const tenant_id of TENANTS) {
  const token = sign({
    role: "anon", // stays on the anon grant — only the SELECT read policy applies
    iss: "supabase",
    tenant_id, // what RLS matches: tenant_id = auth.jwt() ->> 'tenant_id'
    iat,
    exp: iat + TTL_SECONDS,
  });
  console.log(`# ${tenant_id}`);
  console.log(`NEXT_PUBLIC_SUPABASE_TENANT_JWT=${token}\n`);
}
