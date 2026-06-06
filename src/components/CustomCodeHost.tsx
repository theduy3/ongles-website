"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { routeKeyFromPathname, snippetMatchesKey } from "@/lib/route-key";
import type { CustomCodeSnippet } from "@/lib/store-settings-schema";

// Injects admin-authored custom code (analytics, pixels, chat, embeds) into the
// live page. Matched against the current route key, then injected into <head>
// (placement "head") or an end-of-<body> container ("body-end").
//
// We use Range.createContextualFragment — NOT innerHTML / dangerouslySetInnerHTML
// — because browsers do NOT execute <script> tags parsed from innerHTML;
// createContextualFragment produces executable script nodes. Each injected
// top-level element is tagged data-cc-id so the dedupe guard skips re-injection
// on React Strict Mode double-effect and client re-renders (prevents e.g. double
// analytics firing).
//
// Scope: rendered only inside the [lang] layout, so /admin and the /checkin and
// /queue kiosk pages never receive this code. Caveat: legacy document.write()
// snippets won't run post-load.
export function CustomCodeHost({ snippets }: { snippets: CustomCodeSnippet[] }) {
  const pathname = usePathname();
  const bodyRef = useRef<HTMLDivElement>(null);
  const key = routeKeyFromPathname(pathname);

  useEffect(() => {
    const active = snippets.filter(
      (s) => s.enabled && s.code.trim() !== "" && snippetMatchesKey(s.pages, key),
    );

    for (const snippet of active) {
      const target =
        snippet.placement === "head" ? document.head : bodyRef.current;
      if (!target) continue;
      if (target.querySelector(`[data-cc-id="${snippet.id}"]`)) continue;

      const range = document.createRange();
      range.selectNode(target);
      const fragment = range.createContextualFragment(snippet.code);
      for (const node of Array.from(fragment.childNodes)) {
        if (node instanceof Element) node.setAttribute("data-cc-id", snippet.id);
      }
      target.appendChild(fragment);
    }
  }, [snippets, key]);

  return <div ref={bodyRef} data-custom-code-body />;
}
