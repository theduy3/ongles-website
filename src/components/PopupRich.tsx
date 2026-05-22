"use client";

import Image from "next/image";
import { Button } from "@/components/Button";
import { pickText, type Popup } from "@/lib/popup";
import type { Locale } from "@/lib/i18n";

export function PopupRich({
  popup,
  locale,
  onClose,
}: {
  popup: Extract<Popup, { type: "rich" }>;
  locale: Locale;
  onClose: () => void;
}) {
  const href =
    popup.cta && /^https?:\/\//.test(popup.cta.href)
      ? popup.cta.href
      : popup.cta
        ? `/${locale}${popup.cta.href}`
        : null;

  return (
    <div className="overflow-hidden rounded-2xl bg-cream">
      {popup.image && (
        <div className="relative aspect-[16/9] w-full">
          <Image src={popup.image.url} alt={popup.image.alt} fill sizes="(max-width:768px) 100vw, 480px" className="object-cover" />
        </div>
      )}
      <div className="p-8 text-center">
        <h2 className="text-2xl text-espresso md:text-3xl">{pickText(popup.title, locale)}</h2>
        <p className="mt-4 leading-relaxed text-mocha">{pickText(popup.body, locale)}</p>
        {href && popup.cta && (
          <div className="mt-6">
            <Button href={href} variant="solid">{pickText(popup.cta.label, locale)}</Button>
          </div>
        )}
        <button onClick={onClose} className="mt-6 text-xs uppercase tracking-widest text-mocha underline">
          Close
        </button>
      </div>
    </div>
  );
}
