import { getStoreConfig } from "@/lib/store-config";
import { defaultLocale } from "@/lib/i18n";

// Served at /llms.txt — guides AI crawlers (ChatGPT, Perplexity, Claude, AI
// Overviews) to the canonical FR pages and the core business facts. Generated
// from site config so it stays in sync. See https://llmstxt.org.

export async function GET() {
  const { site } = await getStoreConfig();
  const base = `${site.url}/${defaultLocale}`;
  const { address, phone, email } = site.contact;

  const body = `# ${site.name}

> Professional nail salon at Carrefour Beauport, Québec City (QC, Canada). Nail enhancements, fills, manicures and pedicures. Hygiene-first with 15+ years of experience. Walk-ins welcome. Bilingual site — French (default) and English.

- Address: ${address.line1}, ${address.line2}
- Landmark: ${site.contact.landmark}
- Phone: ${phone}
- Email: ${email}
- Languages: Français (canonical), English

## Key pages
- [Services](${base}/services): nail enhancements, fills, manicures and pedicures with CAD pricing
- [About](${base}/about): hygiene-first philosophy and 15+ years of experience
- [Gallery](${base}/gallery): nail art and recent work
- [Reviews](${base}/reviews): client testimonials
- [FAQ](${base}/faq): hours, booking, services and hygiene questions
- [Contact](${base}/contact): address, directions and message form
- [Book online](${base}/book-online): reserve an appointment or walk in
- [Location](${base}/locations): map and directions to Carrefour Beauport
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
