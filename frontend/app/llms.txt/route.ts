import { NextResponse } from "next/server";

import { GUIDES, allIntentPages } from "@/lib/marketing-content";
import { getSiteOrigin } from "@/lib/site-url";

/**
 * Machine-readable site summary for AI answer engines.
 * https://llmstxt.org/
 */
export async function GET() {
  const origin = getSiteOrigin();
  const lines = [
    "# KCOVA",
    "",
    "> KCOVA helps small businesses (especially in Kenya) manage social media,",
    "> product listings, and WhatsApp-ready store pages from one workspace.",
    "",
    `Site: ${origin}`,
    `Sitemap: ${origin}/sitemap.xml`,
    "",
    "## Product",
    "",
    `- Homepage: ${origin}/`,
    `- WhatsApp shops: ${origin}/for/whatsapp-shops`,
    `- Instagram sellers: ${origin}/for/instagram-sellers`,
    `- Guides: ${origin}/guides`,
    "",
    "## Guides",
    "",
    ...GUIDES.map((g) => `- ${g.title}: ${origin}/guides/${g.slug}`),
    "",
    "## Intent pages",
    "",
    ...allIntentPages().map((p) => `- ${p.title}: ${origin}${p.path}`),
    "",
    "## Notes",
    "",
    "- Public merchant catalogs live at /store/{slug} and /store/{slug}/{productSlug}.",
    "- Workspace, login, and signup pages are private and should not be indexed.",
    "- Orders typically continue on WhatsApp after the customer browses the catalog.",
    "",
  ];

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
