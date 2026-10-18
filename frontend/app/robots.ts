import type { MetadataRoute } from "next";

import { getSiteOrigin } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/store/",
          "/guides",
          "/guides/",
          "/for/",
          "/privacy",
          "/terms",
          "/cookies",
          "/ai",
          "/llms.txt",
          "/indexnow-key.txt",
        ],
        disallow: [
          "/workspace",
          "/workspace/",
          "/login",
          "/signup",
          "/offline",
          "/api/",
        ],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
