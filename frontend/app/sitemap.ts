import type { MetadataRoute } from "next";

import { marketingContentPaths } from "@/lib/marketing-content";
import { fetchPublicSitemapCatalog } from "@/lib/public-store-api";
import { absoluteUrl } from "@/lib/site-url";

const MARKETING: {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"];
  priority: number;
}[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/guides", changeFrequency: "weekly", priority: 0.85 },
  ...marketingContentPaths()
    .filter((path) => path !== "/guides")
    .map((path) => ({
      path,
      changeFrequency: "monthly" as const,
      priority: path.startsWith("/for/") ? 0.8 : 0.75,
    })),
  { path: "/ai", changeFrequency: "monthly", priority: 0.6 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/cookies", changeFrequency: "yearly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = MARKETING.map((item) => ({
    url: absoluteUrl(item.path),
    lastModified: now,
    changeFrequency: item.changeFrequency,
    priority: item.priority,
  }));

  const catalog = await fetchPublicSitemapCatalog();
  for (const store of catalog?.stores || []) {
    const storeUpdated = store.updated_at ? new Date(store.updated_at) : now;
    entries.push({
      url: absoluteUrl(`/store/${store.slug}`),
      lastModified: storeUpdated,
      changeFrequency: "daily",
      priority: 0.8,
    });
    for (const product of store.products || []) {
      entries.push({
        url: absoluteUrl(`/store/${store.slug}/${product.slug}`),
        lastModified: product.updated_at
          ? new Date(product.updated_at)
          : storeUpdated,
        changeFrequency: "daily",
        priority: 0.7,
      });
    }
  }

  return entries;
}
