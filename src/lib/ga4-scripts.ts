/**
 * ga4-scripts.ts — Pure helpers for GA4 script injection in layout.tsx.
 *
 * PURE MODULE: no React imports, no Next.js imports, no side effects.
 * Extracted for testability in bun:test (layout.tsx cannot be imported in bun:test).
 *
 * Design contract (MEAS-01 / M-02):
 *   - shouldInjectGA4("") → false — no GA4 when measurement ID is absent
 *   - shouldInjectGA4("G-XXXXXXXXXX") → true — emit Scripts when ID is present
 *   - buildConsentInitScript(id) → inline JS for the beforeInteractive <Script>
 *     which sets window.dataLayer, defines gtag(), and fires the Consent Mode v2
 *     denied-by-default 'default' call before gtag.js loads.
 *
 * Consent Mode v2 (Quebec Law 25):
 *   analytics_storage: 'denied' by default — set to 'granted' only in ConsentBanner
 *   ad_storage: 'denied' always — no advertising cookies on this site
 *   wait_for_update: 500ms — gives the ConsentBanner time to fire before gtag.js fires
 */

/**
 * Returns true if the given GA4 measurement ID is non-empty (and non-whitespace).
 * Falsy / blank IDs mean the tenant has no GA4 property configured yet — suppress
 * all Script tags to avoid runtime errors.
 */
export function shouldInjectGA4(measurementId: string): boolean {
  return measurementId.trim().length > 0;
}

/**
 * Build the content of the inline beforeInteractive <Script> that:
 *   1. Initialises window.dataLayer.
 *   2. Defines the gtag() command function.
 *   3. Sets the current JS timestamp.
 *   4. Fires gtag('consent', 'default', { denied-by-default }) per Consent Mode v2.
 *
 * This inline script MUST execute before gtag.js loads so Consent Mode signals
 * propagate correctly to the GA4 property.
 *
 * Source reference:
 *   https://developers.google.com/tag-platform/security/guides/consent
 */
export function buildConsentInitScript(measurementId: string): string {
  return `
window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
gtag('js', new Date());
gtag('consent', 'default', {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  wait_for_update: 500
});
gtag('config', '${measurementId}');
`.trim();
}
