<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:locale-rules -->
# Locale & Dictionary Parity

Locales: **FR (default) + EN** (ES planned). Critical: `src/dictionaries/fr.json` and any future `es.json` MUST have identical key structure to `en.json`, since `type Dictionary = typeof en` provides no compile-time guard for missing keys in other locales — they silently become `undefined` at runtime. Always sync keys across all locale files.
<!-- END:locale-rules -->
