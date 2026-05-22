import Image from "next/image";
import type { ServiceId } from "@/lib/services";

// Renders a real service photo when one exists, else a styled placeholder.
// Drop a file at public/images/services/<id>.jpg and flip `photo: true` in the
// services registry to swap the placeholder for the real image — no other code
// change. The caller sizes/rounds the box via `className`.
export function ServicePhoto({
  id,
  photo,
  alt,
  label,
  sizes = "(max-width: 768px) 100vw, 33vw",
  className = "",
}: {
  id: ServiceId;
  photo: boolean;
  alt: string;
  label: string;
  sizes?: string;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-tan/40 ${className}`}>
      {photo ? (
        <Image
          src={`/images/services/${id}.jpg`}
          alt={alt}
          fill
          sizes={sizes}
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span className="text-xs uppercase tracking-widest text-espresso/70">
            {label}
          </span>
        </div>
      )}
    </div>
  );
}
