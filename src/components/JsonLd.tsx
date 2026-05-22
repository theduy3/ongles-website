// Renders a schema.org JSON-LD block. Server-rendered into the HTML so crawlers
// see structured data without executing JS. `data` comes from the builders in
// src/lib/seo.ts. dangerouslySetInnerHTML is the standard, safe way to embed
// JSON-LD in React — the payload is our own serialised object, never user input.

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe to inline; no untrusted data flows in here.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
