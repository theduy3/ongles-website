import { NextResponse } from "next/server";
import fallback from "@/data/popups.json";
import { PopupsSchema, pickActive, type Popup } from "@/lib/popup";
import { readPopups } from "@/lib/popups-store";

// Public popup feed. Supabase is the primary source (managed via the admin
// portal); if it's unconfigured or fails, we fall back to the optional
// POPUP_SOURCE_URL and finally the bundled popups.json so the site never loses
// its popups. Response shape is unchanged: { popup }.

async function readFallback(): Promise<Popup[]> {
  let raw: unknown = fallback;

  const url = process.env.POPUP_SOURCE_URL;
  if (url) {
    try {
      const res = await fetch(url, { next: { revalidate: 60 } });
      if (res.ok) raw = await res.json();
      else console.error(`[popups] source responded ${res.status}`);
    } catch (err) {
      console.error("[popups] source fetch failed:", err);
    }
  }

  const parsed = PopupsSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("[popups] invalid fallback data:", parsed.error.issues[0]?.message);
    return [];
  }
  return parsed.data;
}

export async function GET() {
  const popups = (await readPopups()) ?? (await readFallback());
  return NextResponse.json({ popup: pickActive(popups, new Date()) });
}
