import { NextResponse } from "next/server";
import { guard, storeError, badRequest } from "@/lib/admin-http";
import { uploadPopupImage } from "@/lib/popups-store";

// POST multipart/form-data with a `file` field → uploads to Supabase Storage
// and returns { url } for use as a popup image.

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export async function POST(request: Request) {
  const denied = await guard();
  if (denied) return denied;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest("Invalid form data", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return badRequest("No file provided");
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return badRequest("Unsupported image type. Use JPEG, PNG, WebP, GIF, or AVIF.");
  }
  if (file.size > MAX_BYTES) {
    return badRequest("Image is too large (max 5 MB).", 413);
  }

  const result = await uploadPopupImage(file);
  if (!result.ok) return storeError(result);
  return NextResponse.json({ success: true, data: result.data });
}
