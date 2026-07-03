"use client";

/**
 * ConsentBanner.tsx — Client island for Consent Mode v2 (Quebec Law 25).
 *
 * GA4 analytics_storage defaults to 'denied' via the beforeInteractive inline Script
 * in layout.tsx. This banner surfaces on first visit (when consent is not stored),
 * reads an existing consent choice from localStorage on mount, and fires the
 * gtag('consent','update',...) call to grant/revoke analytics collection.
 *
 * Law 25 / Consent Mode v2 invariants enforced here:
 *   - analytics_storage: 'denied' until the user accepts
 *   - ad_storage: ALWAYS 'denied' — this site does not run ad campaigns
 *   - Consent choice stored in localStorage under CONSENT_KEY ('ga4_consent')
 *   - On accept: analytics_storage set to 'granted', banner hides
 *   - On decline: banner hides, analytics_storage stays 'denied'
 *   - On revisit with stored 'accepted': fires gtag update immediately, no banner shown
 *
 * MEAS-02: The consent update must precede any GA4 pageview hits.
 * The 'wait_for_update: 500' in the beforeInteractive inline script gives this
 * component time to fire the update before gtag.js sends the first hit.
 *
 * Exported pure helpers (getStoredConsent, buildConsentUpdate, CONSENT_KEY) allow
 * unit testing without a DOM renderer (bun:test).
 */

import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ConsentState = "accepted" | "declined" | null;

interface ConsentStrings {
  banner: string;
  accept: string;
  decline: string;
}

// ─── Exported pure helpers ────────────────────────────────────────────────────

/** localStorage key for consent persistence. */
export const CONSENT_KEY = "ga4_consent" as const;

/**
 * Read the stored consent state from any Storage-like object.
 * Returns 'accepted' | 'declined' | null.
 * Any stored value other than the two known strings is treated as null
 * (unknown state → show banner).
 */
export function getStoredConsent(storage: Pick<Storage, "getItem">): ConsentState {
  const stored = storage.getItem(CONSENT_KEY);
  if (stored === "accepted" || stored === "declined") return stored;
  return null;
}

/**
 * Build the gtag consent update parameters for accept or decline.
 *
 * Law 25 invariant: ad_storage is ALWAYS 'denied' regardless of the user's choice.
 * analytics_storage is 'granted' only on explicit accept.
 */
export function buildConsentUpdate(accepted: boolean): {
  analytics_storage: "granted" | "denied";
  ad_storage: "denied";
} {
  return {
    analytics_storage: accepted ? "granted" : "denied",
    ad_storage: "denied",
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ConsentBannerProps {
  measurementId: string;
  dict: ConsentStrings;
}

/**
 * ConsentBanner — mounts in the root layout as a 'use client' island.
 * Shows the consent banner on first visit; hides after the user accepts or declines.
 *
 * Pass measurementId from layout.tsx (already validated by shouldInjectGA4 there).
 * Pass dict from layout.tsx dict.consent (content.*.json runtime strings).
 */
export function ConsentBanner({ measurementId, dict }: ConsentBannerProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only run consent logic when GA4 is configured for this tenant.
    if (!measurementId) return;

    try {
      const stored = getStoredConsent(localStorage);
      if (stored === "accepted") {
        // Re-hydrate stored consent on every page load so GA4 receives the grant.
        fireConsentUpdate(true);
      } else if (!stored) {
        // No stored choice → show the banner for the first time.
        setShow(true);
      }
      // stored === 'declined' → do nothing (analytics stays denied, banner stays hidden)
    } catch {
      // localStorage unavailable (private browsing, storage blocked) → show banner.
      setShow(true);
    }
  }, [measurementId]);

  function fireConsentUpdate(accepted: boolean) {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("consent", "update", buildConsentUpdate(accepted));
    }
  }

  function accept() {
    try {
      localStorage.setItem(CONSENT_KEY, "accepted");
    } catch {
      /* storage blocked — fire update anyway for this session */
    }
    fireConsentUpdate(true);
    setShow(false);
  }

  function decline() {
    try {
      localStorage.setItem(CONSENT_KEY, "declined");
    } catch {
      /* storage blocked — consent denied by default */
    }
    // Do NOT fire a consent update — analytics_storage stays 'denied' (default).
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 z-50 w-full border-t border-mocha/10 bg-cream px-4 py-4 shadow-lg sm:flex sm:items-center sm:justify-between sm:gap-4 sm:px-6"
    >
      <p className="text-sm text-espresso">{dict.banner}</p>
      <div className="mt-3 flex flex-shrink-0 gap-3 sm:mt-0">
        <button
          onClick={decline}
          className="rounded-pill border border-mocha/30 bg-transparent px-4 py-2 text-xs font-medium uppercase tracking-widest text-mocha transition hover:bg-mocha/5"
        >
          {dict.decline}
        </button>
        <button
          onClick={accept}
          className="rounded-pill bg-espresso px-4 py-2 text-xs font-medium uppercase tracking-widest text-cream transition hover:bg-espresso/80"
        >
          {dict.accept}
        </button>
      </div>
    </div>
  );
}
