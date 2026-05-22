"use client";

// Owner-supplied HTML (their widget) inside a sandboxed iframe: scripts run but
// stay isolated from the site (no style/JS bleed).
export function PopupEmbed({ html }: { html: string }) {
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;font-family:system-ui,sans-serif}</style></head>
<body>${html}</body></html>`;
  return (
    // SECURITY: `allow-same-origin` + `allow-scripts` together allow a
    // sandboxed script to remove its own sandbox attribute, effectively
    // escaping the sandbox. This combination is only safe because the HTML
    // here is authored by the trusted store owner (their own app/widget) —
    // NOT arbitrary third-party content. Never render untrusted HTML through
    // this component. `allow-same-origin` is required so the iframe can use
    // storage and make network requests back to the same origin.
    <iframe
      title="promotion"
      srcDoc={srcDoc}
      sandbox="allow-scripts allow-popups allow-forms allow-same-origin"
      className="h-[60vh] max-h-[600px] w-full border-0"
    />
  );
}
