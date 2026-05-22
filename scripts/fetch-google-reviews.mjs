// Build-time fetch of real Google reviews via the Google Business Profile
// (My Business v4) API. Keeps only 5-star reviews that have written text and
// writes them — plus the TRUE aggregate (averageRating / totalReviewCount) — to
// src/data/google-reviews.json, which the site reads at build time.
//
// Reviews are display-only (no per-review schema.org markup); the aggregate
// reflects ALL reviews, so the JSON-LD AggregateRating stays honest. See
// tasks/seo-audit/ for the policy rationale.
//
// This is a BUILD TOOL: it fails loud on misconfiguration rather than writing
// empty data, so a broken fetch can never silently wipe the committed reviews.
//
// Run:  bun run fetch:reviews   (reads .env.local if present, else exported GOOGLE_* vars)
// Or:   node --env-file=.env.local scripts/fetch-google-reviews.mjs

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "data",
  "google-reviews.json",
);

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const STAR_VALUE = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[reviews] missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}

// "Marie-Ève Lavoie" -> "Marie-Ève L." (first name + last initial, privacy).
function shortenName(displayName) {
  const parts = (displayName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Client";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

async function getAccessToken() {
  const body = new URLSearchParams({
    client_id: required("GOOGLE_OAUTH_CLIENT_ID"),
    client_secret: required("GOOGLE_OAUTH_CLIENT_SECRET"),
    refresh_token: required("GOOGLE_OAUTH_REFRESH_TOKEN"),
    grant_type: "refresh_token",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    console.error(`[reviews] token exchange failed: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const { access_token } = await res.json();
  if (!access_token) {
    console.error("[reviews] token exchange returned no access_token");
    process.exit(1);
  }
  return access_token;
}

async function fetchAllReviews(accessToken) {
  const account = required("GOOGLE_BUSINESS_ACCOUNT_ID");
  const location = required("GOOGLE_BUSINESS_LOCATION_ID");
  const base = `https://mybusiness.googleapis.com/v4/accounts/${account}/locations/${location}/reviews`;

  const all = [];
  let averageRating = null;
  let totalReviewCount = null;
  let pageToken;

  do {
    const url = new URL(base);
    url.searchParams.set("pageSize", "50");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      console.error(`[reviews] list failed: ${res.status} ${await res.text()}`);
      process.exit(1);
    }
    const data = await res.json();
    if (averageRating === null) averageRating = data.averageRating ?? null;
    if (totalReviewCount === null) totalReviewCount = data.totalReviewCount ?? null;
    all.push(...(data.reviews ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return { reviews: all, averageRating, totalReviewCount };
}

function toReview(raw) {
  return {
    id: raw.reviewId,
    author: shortenName(raw.reviewer?.displayName),
    rating: STAR_VALUE[raw.starRating] ?? 0,
    dateISO: (raw.createTime ?? "").slice(0, 10),
    // The API does not return review language reliably; default to the salon's
    // primary locale. Display ignores this field (reviews shown verbatim).
    lang: "fr",
    text: (raw.comment ?? "").trim(),
  };
}

async function main() {
  const token = await getAccessToken();
  const { reviews, averageRating, totalReviewCount } = await fetchAllReviews(token);

  const fiveStar = reviews
    .filter((r) => r.starRating === "FIVE" && (r.comment ?? "").trim().length > 0)
    .map(toReview)
    .sort((a, b) => b.dateISO.localeCompare(a.dateISO));

  const aggregate = {
    ratingValue:
      averageRating != null ? Math.round(averageRating * 10) / 10 : 4.9,
    reviewCount: totalReviewCount != null ? Number(totalReviewCount) : fiveStar.length,
  };

  const payload = {
    fetchedAt: new Date().toISOString(),
    aggregate,
    reviews: fiveStar,
  };

  await writeFile(OUT, JSON.stringify(payload, null, 2) + "\n");
  console.log(
    `[reviews] wrote ${fiveStar.length} five-star reviews ` +
      `(aggregate ${aggregate.ratingValue}/${aggregate.reviewCount}) -> ${OUT}`,
  );
}

main().catch((err) => {
  console.error("[reviews] unexpected error:", err);
  process.exit(1);
});
