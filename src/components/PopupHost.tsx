"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Popup } from "@/lib/popup";
import type { Locale } from "@/lib/i18n";
import { PopupRich } from "./PopupRich";
import { PopupEmbed } from "./PopupEmbed";

const seenKey = (p: Popup) => `popup:${p.id}:${p.version}`;

function shouldShow(p: Popup): boolean {
  if (p.frequency === "always") return true;
  try {
    const key = seenKey(p);
    if (p.frequency === "daily") {
      const last = Number(localStorage.getItem(key) ?? 0);
      return Date.now() - last > 86_400_000;
    }
    const store = p.frequency === "session" ? sessionStorage : localStorage;
    return !store.getItem(key);
  } catch {
    return true; // storage blocked → show once this load
  }
}

function markSeen(p: Popup) {
  try {
    if (p.frequency === "always") return;
    if (p.frequency === "daily")
      localStorage.setItem(seenKey(p), String(Date.now()));
    else
      (p.frequency === "session" ? sessionStorage : localStorage).setItem(
        seenKey(p),
        "1",
      );
  } catch {
    /* ignore */
  }
}

export function PopupHost({ locale }: { locale: Locale }) {
  const [popup, setPopup] = useState<Popup | null>(null);
  const reduce = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/popups")
      .then((r) => r.json())
      .then((d: { popup: Popup | null }) => {
        if (!alive || !d.popup || !shouldShow(d.popup)) return;
        setPopup(d.popup);
        markSeen(d.popup);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!popup) return;

    // Store the element that was focused before the modal opened so we can
    // restore it when the modal closes.
    previousFocusRef.current = document.activeElement;

    // Move focus into the modal card so keyboard users are immediately inside.
    cardRef.current?.focus();

    const getFocusable = (): HTMLElement[] => {
      if (!cardRef.current) return [];
      return Array.from(
        cardRef.current.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled"));
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPopup(null);
        return;
      }
      if (e.key === "Tab") {
        const focusable = getFocusable();
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      // Restore focus to the element that was active before the modal opened.
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, [popup]);

  const close = () => setPopup(null);

  return (
    <AnimatePresence>
      {popup && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Promotion"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
        >
          {/* Backdrop: visible but non-interactive so header/nav remain clickable */}
          <div className="absolute inset-0 bg-espresso/60" aria-hidden="true" />
          <motion.div
            ref={cardRef}
            tabIndex={-1}
            className="relative w-full max-w-md pointer-events-auto outline-none"
            initial={{ scale: reduce ? 1 : 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: reduce ? 1 : 0.96, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
          >
            {popup.type === "rich" ? (
              <PopupRich popup={popup} locale={locale} onClose={close} />
            ) : (
              <div className="overflow-hidden rounded-2xl bg-cream">
                <PopupEmbed html={popup.html} />
                <button
                  onClick={close}
                  className="block w-full py-3 text-xs uppercase tracking-widest text-mocha underline"
                >
                  Close
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
